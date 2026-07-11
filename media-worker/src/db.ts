import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import type { Job } from "./types.js";

export const db = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

export async function claimJob() {
  const { data, error } = await db.rpc("claim_recipe_import_job", {
    worker_id: config.WORKER_ID, lease_seconds: config.JOB_LEASE_SECONDS,
  });
  if (error) throw error;
  return (data?.[0] as Job | undefined) ?? null;
}
export async function updateJob(id: string, values: Record<string, unknown>) {
  const { error } = await db.from("recipe_import_jobs").update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id).eq("locked_by", config.WORKER_ID);
  if (error) throw error;
}
export async function heartbeat(id: string) {
  await updateJob(id, { heartbeat_at: new Date().toISOString(),
    lease_until: new Date(Date.now() + config.JOB_LEASE_SECONDS * 1000).toISOString() });
}
