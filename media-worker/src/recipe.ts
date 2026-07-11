import { z } from "zod";
import { config } from "./config.js";
import { db, updateJob } from "./db.js";
import type { Job } from "./types.js";

const ingredient = z.object({ name: z.string().min(1), normalized_name: z.string().nullable(),
  quantity_text: z.string().nullable(), quantity: z.number().min(0).nullable(), unit: z.string().nullable(),
  normalized_unit: z.string().nullable(), notes: z.string().nullable(), sector: z.string(), section: z.string().nullable() }).strict();
const recipeSchema = z.object({ title: z.string().min(1), description: z.string().nullable(),
  prep_time_minutes: z.number().min(0).nullable(), cook_time_minutes: z.number().min(0).nullable(),
  total_time_minutes: z.number().min(0).nullable(), servings: z.number().min(0).nullable(),
  ingredients: z.array(ingredient), steps: z.array(z.object({ order: z.number().int().min(1), instruction: z.string().min(1), section: z.string().nullable() }).strict()),
  parsing_confidence: z.enum(["high", "medium", "low"]), warnings: z.array(z.string()) }).strict();

export async function structureAndSave(job: Job, sourceText: string) {
  if (job.recipe_id) return job.recipe_id;
  await updateJob(job.id, { status: "structuring", progress: 80, current_stage: "Organizando a receita" });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST",
    headers: { Authorization: `Bearer ${config.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.OPENROUTER_MODEL, temperature: 0,
      messages: [{ role: "system", content: "Estruture a receita sem inventar dados. Use null quando ausente. Retorne somente JSON conforme o schema." },
        { role: "user", content: `<conteudo_nao_confiavel>\n${sourceText.slice(0, 100_000)}\n</conteudo_nao_confiavel>` }],
      response_format: { type: "json_schema", json_schema: { name: "recipe", strict: true, schema: z.toJSONSchema(recipeSchema) } } }) });
  if (!response.ok) throw new Error(`OpenRouter respondeu ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const recipe = recipeSchema.parse(JSON.parse(payload.choices?.[0]?.message?.content ?? ""));
  if (!recipe.ingredients.length || !recipe.steps.length) {
    await updateJob(job.id, { status: "needs_manual_input", progress: 100,
      current_stage: "Precisamos de mais informações", transcript: sourceText,
      fallback_reason: "Conteúdo insuficiente para ingredientes e modo de preparo", locked_by: null, lease_until: null });
    return null;
  }
  await updateJob(job.id, { status: "saving", progress: 92, current_stage: "Finalizando" });
  const replaceId = typeof job.media_metadata?.replace_recipe_id === "string" ? job.media_metadata.replace_recipe_id : null;
  let recipeId = replaceId;
  if (replaceId) {
    await db.from("recipe_ingredients").delete().eq("recipe_id", replaceId);
    await db.from("recipe_steps").delete().eq("recipe_id", replaceId);
    const { error } = await db.from("recipes").update({ title: recipe.title, description: recipe.description,
      prep_time_minutes: recipe.prep_time_minutes, cook_time_minutes: recipe.cook_time_minutes,
      total_time_minutes: recipe.total_time_minutes, servings: recipe.servings,
      source_url: job.source_url, source_url_normalized: job.normalized_url,
      source_platform: job.source_platform, parsing_confidence: recipe.parsing_confidence,
      warnings: recipe.warnings, status: recipe.parsing_confidence === "low" ? "needs_review" : "ready",
      import_job_id: job.id, parser_version: "4-async-worker", schema_version: "1" }).eq("id", replaceId).eq("user_id", job.user_id);
    if (error) throw error;
  } else {
    const { data, error } = await db.from("recipes").insert({ user_id: job.user_id, import_job_id: job.id,
      title: recipe.title, description: recipe.description, prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes, total_time_minutes: recipe.total_time_minutes, servings: recipe.servings,
      source_url: job.source_url, source_url_normalized: job.normalized_url, source_platform: job.source_platform,
      parsing_confidence: recipe.parsing_confidence, warnings: recipe.warnings,
      status: recipe.parsing_confidence === "low" ? "needs_review" : "ready",
      parser_version: "4-async-worker", schema_version: "1" }).select("id").single();
    if (error) throw error; recipeId = data.id;
  }
  const { error: ingredientsError } = await db.from("recipe_ingredients").insert(recipe.ingredients.map((x, position) => ({ ...x, recipe_id: recipeId, position })));
  if (ingredientsError) throw ingredientsError;
  const { error: stepsError } = await db.from("recipe_steps").insert(recipe.steps.map((x, position) => ({ recipe_id: recipeId, position, instruction: x.instruction, section: x.section })));
  if (stepsError) throw stepsError;
  await db.from("usage_events").upsert({ user_id: job.user_id, job_id: job.id, event_type: "completed_import" }, { onConflict: "job_id" });
  await updateJob(job.id, { status: recipe.parsing_confidence === "low" ? "needs_review" : "completed", progress: 100,
    current_stage: "Receita pronta", completed_at: new Date().toISOString(), recipe_id: recipeId,
    transcript: sourceText, locked_by: null, lease_until: null, heartbeat_at: new Date().toISOString() });
  return recipeId;
}
