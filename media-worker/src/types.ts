export type Job = {
  id: string; user_id: string; input_type: "url" | "text" | "audio";
  source_url: string | null; normalized_url: string | null;
  source_platform: string | null; raw_text: string | null; audio_path: string | null;
  status: string; attempts: number; cancel_requested_at: string | null;
  media_metadata: Record<string, unknown>; transcript: string | null; recipe_id: string | null;
};
export type Segment = { segment_index: number; status: string; transcript: string | null; start_seconds: number; end_seconds: number };
export type WorkerErrorCode = "COBALT_FETCH_EMPTY" | "COBALT_AUDIO_UNAVAILABLE" |
 "COBALT_VIDEO_UNAVAILABLE" | "MEDIA_HAS_NO_AUDIO" | "MEDIA_CORRUPTED" |
 "UNSUPPORTED_MEDIA" | "STORAGE_DOWNLOAD_FAILED" | "FFMPEG_FAILED" |
 "TRANSCRIPTION_FAILED" | "JOB_TIMEOUT" | "JOB_CANCELLED" | "NETWORK_ERROR";
export class WorkerError extends Error { constructor(public code: WorkerErrorCode, message: string, public retryable = false) { super(message); } }
