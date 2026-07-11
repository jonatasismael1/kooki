import { createServer } from "node:http";
import { join } from "node:path";
import { config } from "./config.js";
import { claimJob, db, heartbeat, updateJob } from "./db.js";
import { clean, checkDisk, acquireLink, fetchMedia, segmentStream, storageResponse } from "./process.js";
import { transcribe } from "./transcribe.js";
import { structureAndSave } from "./recipe.js";
import { log, logError } from "./log.js";
import { WorkerError, type Job } from "./types.js";

let stopping = false; let activeJobs = 0;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function friendly(code: string) {
  if (code.startsWith("COBALT_")) return "Não conseguimos acessar o áudio desse conteúdo. Use a legenda, envie o arquivo ou tente novamente.";
  if (code === "MEDIA_HAS_NO_AUDIO") return "O arquivo não possui uma faixa de áudio utilizável.";
  if (code === "MEDIA_CORRUPTED" || code === "UNSUPPORTED_MEDIA") return "O arquivo está corrompido ou usa um formato não suportado.";
  if (code === "JOB_CANCELLED") return "A importação foi cancelada.";
  return "Não foi possível processar a mídia agora. Tente novamente ou use o texto manual.";
}
async function textualFallback(job: Job) {
  if (job.raw_text?.trim()) return job.raw_text;
  if (!job.normalized_url) return "";
  try {
    const url = new URL(job.normalized_url);
    if (job.source_platform === "tiktok") {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`);
      const data = await r.json() as { title?: string }; return data.title ?? "";
    }
    const r = await fetch(url, { signal: AbortSignal.timeout(config.MEDIA_IDLE_TIMEOUT_SECONDS * 1000) });
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " ").slice(0, 30_000);
  } catch { return ""; }
}
async function processJob(job: Job) {
  const directory = join(config.TEMP_DIRECTORY, job.id); activeJobs++;
  const beat = setInterval(() => heartbeat(job.id).catch((error) => logError("heartbeat_failed", error, { job_id: job.id })), Math.max(10_000, config.JOB_LEASE_SECONDS * 500));
  try {
    await checkDisk(directory);
    const { data: current } = await db.from("recipe_import_jobs").select("cancel_requested_at,recipe_id").eq("id", job.id).single();
    if (current?.cancel_requested_at) throw new WorkerError("JOB_CANCELLED", "cancelled");
    if (current?.recipe_id) { await updateJob(job.id, { status: "completed", progress: 100, locked_by: null, lease_until: null }); return; }
    let text = await textualFallback(job);
    if (job.input_type === "audio" || (job.input_type === "url" && job.source_platform !== "blog")) {
      await updateJob(job.id, { status: "extracting", progress: 10, current_stage: "Buscando o conteúdo" });
      try {
        let response: Response;
        let acquisition = "upload";
        if (job.audio_path) response = await storageResponse(job.audio_path);
        else { const media = await acquireLink(job.normalized_url ?? job.source_url ?? ""); acquisition = media.attempt;
          response = await fetchMedia(media.url); }
        await updateJob(job.id, { status: "extracting", progress: 25, current_stage: "Preparando o áudio", media_metadata: { acquisition } });
        let segmented;
        try { segmented = await segmentStream(job.id, response, directory); }
        catch (audioError) {
          if (job.audio_path || acquisition !== "audio") throw audioError;
          log("audio_stream_failed", { job_id: job.id, reason: audioError instanceof Error ? audioError.message : "unknown" });
          await clean(directory); await checkDisk(directory);
          await updateJob(job.id, { status: "extracting", progress: 20, current_stage: "Buscando o vídeo como alternativa" });
          const video = await acquireLink(job.normalized_url ?? job.source_url ?? "", true);
          acquisition = "video";
          segmented = await segmentStream(job.id, await fetchMedia(video.url), directory);
        }
        const { files, probe } = segmented;
        await updateJob(job.id, { status: "transcribing", progress: 45, current_stage: "Transcrevendo o conteúdo",
          media_metadata: { acquisition, probe, segment_count: files.length } });
        const transcript = await transcribe(job.id, directory, files); text = [text, transcript].filter(Boolean).join("\n\n");
      } catch (error) {
        if (!text.trim() || text.length < 120) throw error;
        log("media_fallback_to_text", { job_id: job.id, reason: error instanceof Error ? error.message : "unknown" });
      }
    }
    if (text.trim().length < 80) {
      await updateJob(job.id, { status: "needs_manual_input", progress: 100, current_stage: "Precisamos de mais informações",
        error_code: "COBALT_FETCH_EMPTY", error_message: friendly("COBALT_FETCH_EMPTY"), locked_by: null, lease_until: null }); return;
    }
    await structureAndSave(job, text);
    if (job.audio_path) await db.storage.from("recipe-audio").remove([job.audio_path]);
  } catch (error) {
    const code = error instanceof WorkerError ? error.code : "NETWORK_ERROR";
    const retryable = error instanceof WorkerError && error.retryable && job.attempts < config.MAX_JOB_ATTEMPTS;
    logError("job_failed", error, { job_id: job.id, platform: job.source_platform, stage: job.status, attempt: job.attempts, error_code: code });
    await updateJob(job.id, retryable ? { status: "pending", current_stage: "Tentaremos novamente", error_code: code,
      error_message: friendly(code), locked_by: null, lease_until: null }
      : { status: code === "JOB_CANCELLED" ? "cancelled" : "failed", progress: 100, current_stage: "Importação não concluída",
        error_code: code, error_message: friendly(code), completed_at: new Date().toISOString(), locked_by: null, lease_until: null });
  } finally { clearInterval(beat); await clean(directory); activeJobs--; }
}
async function loop() {
  while (!stopping) {
    try { if (activeJobs < config.WORKER_CONCURRENCY) { const job = await claimJob(); if (job) { void processJob(job); continue; } } }
    catch (error) { logError("claim_failed", error); }
    await sleep(config.JOB_POLL_INTERVAL_MS);
  }
}
const server = createServer((req, res) => { if (req.url !== "/health") { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ status: "ok", worker_id: config.WORKER_ID, active_jobs: activeJobs })); });
server.listen(config.HEALTH_PORT, () => log("worker_started", { worker_id: config.WORKER_ID, port: config.HEALTH_PORT }));
async function shutdown(signal: string) { if (stopping) return; stopping = true; log("shutdown_started", { signal, active_jobs: activeJobs });
  server.close(); while (activeJobs > 0) await sleep(500); process.exit(0); }
process.on("SIGTERM", () => void shutdown("SIGTERM")); process.on("SIGINT", () => void shutdown("SIGINT"));
void loop();
