import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config.js";
import { db, updateJob } from "./db.js";
import { WorkerError } from "./types.js";
import { mergeTranscripts } from "./merge.js";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function transcribe(jobId: string, directory: string, files: string[]) {
  const { data: existing } = await db.from("recipe_import_segments").select("*").eq("job_id", jobId);
  const completed = new Map((existing ?? []).filter((x) => x.status === "completed").map((x) => [x.segment_index, x.transcript]));
  for (let index = 0; index < files.length; index++) {
    const { data: job } = await db.from("recipe_import_jobs").select("cancel_requested_at").eq("id", jobId).single();
    if (job?.cancel_requested_at) throw new WorkerError("JOB_CANCELLED", "cancelled");
    if (completed.has(index)) continue;
    const start = index * config.TRANSCRIPTION_CHUNK_SECONDS;
    await db.from("recipe_import_segments").upsert({ job_id: jobId, segment_index: index, status: "processing",
      start_seconds: start, end_seconds: start + config.TRANSCRIPTION_CHUNK_SECONDS, attempts: 0 }, { onConflict: "job_id,segment_index" });
    let last = "";
    for (let attempt = 1; attempt <= 3; attempt++) try {
      const bytes = await readFile(join(directory, files[index]));
      const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", { method: "POST",
        headers: { Authorization: `Bearer ${config.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.OPENROUTER_STT_MODEL,
          input_audio: { data: bytes.toString("base64"), format: "mp3" }, language: "pt", temperature: 0 }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json() as { text?: string }; if (!value.text?.trim()) throw new Error("transcrição vazia");
      completed.set(index, value.text.trim());
      await db.from("recipe_import_segments").update({ status: "completed", transcript: value.text.trim(), attempts: attempt, error: null })
        .eq("job_id", jobId).eq("segment_index", index); break;
    } catch (error) { last = error instanceof Error ? error.message : "falha";
      await db.from("recipe_import_segments").update({ attempts: attempt, error: last }).eq("job_id", jobId).eq("segment_index", index);
      if (attempt < 3) await wait(1000 * 2 ** (attempt - 1)); }
    if (!completed.has(index)) throw new WorkerError("TRANSCRIPTION_FAILED", last, true);
    await updateJob(jobId, { progress: 45 + Math.round(((index + 1) / files.length) * 30), current_stage: "Transcrevendo o conteúdo" });
  }
  return mergeTranscripts([...completed.entries()].sort(([a], [b]) => a - b).map(([, text]) => text as string));
}
