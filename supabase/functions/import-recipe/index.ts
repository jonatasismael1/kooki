import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4";
import { corsHeaders } from "../_shared/cors.ts";
import { safeUrl } from "../_shared/url.ts";

const requestSchema = z.object({
  inputType: z.enum(["url", "text", "audio"]),
  sourceUrl: z.string().nullish(),
  rawText: z.string().max(100_000).nullish(),
  storagePath: z.string().max(1024).nullish(),
  audioPath: z.string().max(1024).nullish(),
  replaceRecipeId: z.string().uuid().nullish(),
  idempotencyKey: z.string().max(200).nullish(),
});

function response(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function failure(code: string, message: string, status = 400) {
  return response({ success: false, error: { code, message } }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return failure("METHOD_NOT_ALLOWED", "Método não permitido.", 405);

  const started = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!supabaseUrl || !publicKey || !secretKey)
      return failure("SERVER_CONFIGURATION", "Serviço temporariamente indisponível.", 503);
    if (!authorization?.startsWith("Bearer "))
      return failure("UNAUTHORIZED", "Entre novamente para continuar.", 401);

    const userClient = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user)
      return failure("UNAUTHORIZED", "Sua sessão expirou. Entre novamente.", 401);

    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success)
      return failure("INVALID_INPUT", "Revise os dados enviados e tente novamente.");
    const body = parsed.data;
    const storagePath = body.storagePath ?? body.audioPath ?? null;
    if (storagePath && !storagePath.startsWith(`${user.id}/`))
      return failure("INVALID_STORAGE_PATH", "Arquivo enviado inválido.", 403);

    let normalizedUrl: string | null = null;
    let platform = body.inputType === "audio" ? "audio" : "manual";
    if (body.inputType === "url") {
      if (!body.sourceUrl) return failure("INVALID_URL", "Informe um link válido.");
      const source = safeUrl(body.sourceUrl);
      normalizedUrl = source.toString();
      const host = source.hostname.replace(/^www\./, "");
      platform = host.includes("youtube") || host === "youtu.be" ? "youtube"
        : host.includes("instagram") ? "instagram"
        : host.includes("tiktok") ? "tiktok" : "blog";
    }
    if (body.inputType === "text" && !body.rawText?.trim())
      return failure("EMPTY_TEXT", "Cole o texto ou a legenda da receita.");
    if (body.inputType === "audio" && !storagePath)
      return failure("MISSING_MEDIA", "Envie um arquivo para continuar.");

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const idempotency = body.idempotencyKey ?? crypto.randomUUID();
    const { data: job, error } = await admin.from("recipe_import_jobs").insert({
      user_id: user.id,
      input_type: body.inputType,
      idempotency_key: idempotency,
      source_url: body.sourceUrl ?? null,
      normalized_url: normalizedUrl,
      source_platform: platform,
      raw_text: body.rawText ?? null,
      audio_path: storagePath,
      status: "pending",
      current_stage: "Analisando o conteúdo",
      progress: 0,
      parser_version: "4-async-worker",
      schema_version: "1",
      media_metadata: body.replaceRecipeId ? { replace_recipe_id: body.replaceRecipeId } : {},
    }).select("id,status").single();
    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await admin.from("recipe_import_jobs")
          .select("id,status").eq("user_id", user.id)
          .eq("idempotency_key", idempotency).single();
        if (existing) return response({ success: true, job_id: existing.id, status: existing.status }, 202);
      }
      throw error;
    }
    console.info(JSON.stringify({ event: "job_enqueued", job_id: job.id,
      user_id: `${user.id.slice(0, 8)}…`, platform, elapsed_ms: Date.now() - started }));
    return response({ success: true, job_id: job.id, status: "pending" }, 202);
  } catch (error) {
    console.error(JSON.stringify({ event: "enqueue_failed", elapsed_ms: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown" }));
    return failure("NETWORK_ERROR", "Não foi possível iniciar a importação. Tente novamente.", 500);
  }
});
