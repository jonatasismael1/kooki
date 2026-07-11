import { spawn } from "node:child_process";
import { mkdir, readdir, rm, statfs } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import { config } from "./config.js";
import { log } from "./log.js";
import { WorkerError } from "./types.js";

type Cobalt = { status?: string; url?: string; filename?: string; audio?: string;
  picker?: Array<{ type?: string; url?: string }>; error?: { code?: string } };

async function cobalt(url: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.MEDIA_IDLE_TIMEOUT_SECONDS * 1000);
  try {
    const response = await fetch(`${config.COBALT_API_URL.replace(/\/+$/, "")}/`, {
      method: "POST", signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url, filenameStyle: "basic", alwaysProxy: true,
        localProcessing: "disabled", ...body }),
    });
    const result = await response.json() as Cobalt;
    log("cobalt_response", { status_http: response.status, status: result.status,
      error_code: result.error?.code, picker_count: result.picker?.length ?? 0 });
    return result;
  } catch (error) { throw new WorkerError("NETWORK_ERROR", error instanceof Error ? error.message : "Cobalt indisponível", true); }
  finally { clearTimeout(timeout); }
}
function mediaUrl(result: Cobalt, preferVideo = false) {
  if ((result.status === "tunnel" || result.status === "redirect") && result.url) return result.url;
  if (result.status === "picker") {
    if (!preferVideo && result.audio) return result.audio;
    return result.picker?.find((item) => item.type === "video")?.url;
  }
  return undefined;
}
export async function acquireLink(url: string, videoOnly = false) {
  let audio: Cobalt = {};
  if (!videoOnly) {
    audio = await cobalt(url, { downloadMode: "audio", audioFormat: "mp3", audioBitrate: "64" });
    const direct = mediaUrl(audio);
    if (direct) return { url: direct, attempt: "audio" };
  }
  const video = await cobalt(url, { downloadMode: "auto", videoQuality: "720" });
  const fallback = mediaUrl(video, true);
  if (fallback) return { url: fallback, attempt: "video" };
  const code = video.error?.code ?? audio.error?.code;
  if (code === "error.api.fetch.empty") throw new WorkerError("COBALT_FETCH_EMPTY", "O conteúdo não disponibilizou mídia.");
  throw new WorkerError("COBALT_VIDEO_UNAVAILABLE", "O Cobalt não retornou áudio ou vídeo.");
}
export async function fetchMedia(url: string) {
  const controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal });
  if (!response.body) return response;
  let timer: NodeJS.Timeout;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error("media idle timeout")), config.MEDIA_IDLE_TIMEOUT_SECONDS * 1000);
  };
  reset();
  const guarded = response.body.pipeThrough(new TransformStream({
    transform(chunk, streamController) { reset(); streamController.enqueue(chunk); },
    flush() { clearTimeout(timer); },
  }));
  return new Response(guarded, { status: response.status, statusText: response.statusText, headers: response.headers });
}
async function run(command: string, args: string[], input?: Readable) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
    let stderr = ""; child.stderr!.on("data", (x) => { stderr = (stderr + x.toString()).slice(-12000); });
    if (input) pipeline(input, child.stdin!).catch(() => child.kill("SIGKILL"));
    let stdout = ""; child.stdout!.on("data", (x) => { stdout += x.toString(); });
    child.on("error", reject); child.on("close", (code) => code === 0 ? resolve(stdout) :
      reject(new WorkerError(stderr.includes("does not contain any stream") ? "MEDIA_HAS_NO_AUDIO" : "FFMPEG_FAILED", stderr.slice(-500))));
  });
}
export async function checkDisk(directory: string) {
  await mkdir(directory, { recursive: true });
  const disk = await statfs(directory); const freeMb = Number(disk.bavail * disk.bsize) / 1024 / 1024;
  if (freeMb < config.MIN_FREE_DISK_MB) throw new WorkerError("FFMPEG_FAILED", "Espaço temporário insuficiente", true);
}
export async function segmentStream(jobId: string, response: Response, directory: string) {
  if (!response.ok || !response.body) throw new WorkerError("NETWORK_ERROR", `Mídia respondeu ${response.status}`, true);
  const pattern = join(directory, "part-%03d.mp3");
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-ac", "1", "-ar", "16000",
    "-b:a", "64k", "-f", "segment", "-segment_time", String(config.TRANSCRIPTION_CHUNK_SECONDS), "-reset_timestamps", "1", pattern],
    Readable.fromWeb(response.body as never));
  const files = (await readdir(directory)).filter((x) => /^part-\d+\.mp3$/.test(x)).sort();
  if (!files.length) throw new WorkerError("MEDIA_HAS_NO_AUDIO", "A mídia não possui faixa de áudio.");
  const probe = JSON.parse(await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size,format_name:stream=codec_name,codec_type,sample_rate,channels", "-of", "json", join(directory, files[0])])) as Record<string, unknown>;
  log("media_segmented", { job_id: jobId, segment_count: files.length, format: probe });
  return { files, probe };
}
export async function storageResponse(path: string) {
  const { db } = await import("./db.js");
  const { data, error } = await db.storage.from("recipe-audio").createSignedUrl(path, 300);
  if (error) throw new WorkerError("STORAGE_DOWNLOAD_FAILED", error.message, true);
  try { return await fetchMedia(data.signedUrl); }
  catch { throw new WorkerError("STORAGE_DOWNLOAD_FAILED", "Falha ao ler o arquivo privado", true); }
}
export async function clean(directory: string) { await rm(directory, { recursive: true, force: true }); }
