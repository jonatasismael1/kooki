import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  OPENROUTER_API_KEY: z.string().min(20),
  OPENROUTER_MODEL: z.string().default("google/gemini-2.5-flash-lite"),
  OPENROUTER_STT_MODEL: z.string().default("openai/whisper-large-v3"),
  COBALT_API_URL: z.string().url().default("https://kooki.up.railway.app/"),
  WORKER_ID: z.string().default(() => `worker-${process.pid}`),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().min(250).default(3000),
  JOB_LEASE_SECONDS: z.coerce.number().int().min(30).default(300),
  MEDIA_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(10).default(120),
  TRANSCRIPTION_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  TRANSCRIPTION_CHUNK_SECONDS: z.coerce.number().int().min(60).default(600),
  MAX_JOB_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  MIN_FREE_DISK_MB: z.coerce.number().int().min(64).default(512),
  HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  TEMP_DIRECTORY: z.string().default("/tmp/kooki-media"),
});
export const config = envSchema.parse(process.env);
