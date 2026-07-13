import {
  deleteLocalRecipe,
  getLocalRecipe,
  updateLocalRecipe,
  type LocalRecipe,
} from "./local-store";
import {
  recipeToSnapshot,
  type RecipeRecord,
  type RecipeSnapshot,
  type RecipeVersion,
} from "./recipes";
import { supabase } from "./supabase";

const localVersionPrefix = "kooki-recipe-versions:";
const pendingDeleteKey = "kooki-pending-recipe-deletions";

function localVersions(recipeId: string): RecipeVersion[] {
  try {
    return JSON.parse(localStorage.getItem(`${localVersionPrefix}${recipeId}`) ?? "[]") as RecipeVersion[];
  } catch {
    return [];
  }
}

function saveLocalVersion(recipe: RecipeRecord) {
  const versions = localVersions(recipe.id);
  const firstGeneratedVersion = Boolean(recipe.status === "needs_review" && !versions.length);
  const version: RecipeVersion = {
    id: crypto.randomUUID(),
    recipe_id: recipe.id,
    kind: firstGeneratedVersion ? "original_ai" : "manual",
    label: firstGeneratedVersion
      ? "Receita original gerada pela IA"
      : "Versão anterior à alteração manual",
    snapshot: recipeToSnapshot(recipe),
    created_at: new Date().toISOString(),
  };
  localStorage.setItem(`${localVersionPrefix}${recipe.id}`, JSON.stringify([version, ...versions]));
}

export async function loadRecipeForEditing(recipeId: string): Promise<RecipeRecord> {
  if (!supabase) {
    const recipe = getLocalRecipe(recipeId);
    if (!recipe) throw new Error("Receita não encontrada.");
    return recipe;
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("*,recipe_ingredients(*),recipe_steps(*)")
    .eq("id", recipeId)
    .single();
  if (error) throw error;
  return data as RecipeRecord;
}

export async function saveRecipeRevision(
  recipe: RecipeRecord,
  snapshot: RecipeSnapshot,
): Promise<RecipeRecord> {
  if (!supabase) {
    saveLocalVersion(recipe);
    const updated = {
      ...recipe,
      title: snapshot.title,
      description: snapshot.description,
      servings: snapshot.servings,
      status: "ready" as const,
      recipe_ingredients: snapshot.ingredients,
      recipe_steps: snapshot.steps,
    };
    updateLocalRecipe(updated as LocalRecipe);
    return updated;
  }

  const { error } = await supabase.rpc("save_recipe_revision", {
    p_recipe_id: recipe.id,
    p_snapshot: snapshot,
  });
  if (error) throw error;
  return loadRecipeForEditing(recipe.id);
}

export async function loadRecipeVersions(recipeId: string): Promise<RecipeVersion[]> {
  if (!supabase) return localVersions(recipeId);
  const { data, error } = await supabase
    .from("recipe_versions")
    .select("id,recipe_id,kind,label,snapshot,created_at")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RecipeVersion[];
}

export async function archiveRecipe(recipeId: string) {
  if (!supabase) {
    const recipe = getLocalRecipe(recipeId);
    if (!recipe) throw new Error("Receita não encontrada.");
    updateLocalRecipe({ ...recipe, status: "archived" });
    return;
  }
  const { error } = await supabase.from("recipes").update({ status: "archived" }).eq("id", recipeId);
  if (error) throw error;
}

export async function undoArchiveRecipe(recipeId: string, previousStatus: string) {
  if (!supabase) {
    const recipe = getLocalRecipe(recipeId);
    if (!recipe) throw new Error("Receita não encontrada.");
    updateLocalRecipe({ ...recipe, status: previousStatus as LocalRecipe["status"] });
    return;
  }
  const { error } = await supabase.from("recipes").update({ status: previousStatus }).eq("id", recipeId);
  if (error) throw error;
}

export async function permanentlyDeleteArchivedRecipe(recipeId: string) {
  if (!supabase) {
    deleteLocalRecipe(recipeId);
    return;
  }
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("status", "archived");
  if (error) throw error;
}

type PendingDeletion = { recipeId: string; deleteAt: number };

function pendingDeletions(): PendingDeletion[] {
  try {
    return JSON.parse(localStorage.getItem(pendingDeleteKey) ?? "[]") as PendingDeletion[];
  } catch {
    return [];
  }
}

function writePendingDeletions(items: PendingDeletion[]) {
  localStorage.setItem(pendingDeleteKey, JSON.stringify(items));
}

function removePendingDeletion(recipeId: string) {
  writePendingDeletions(pendingDeletions().filter((item) => item.recipeId !== recipeId));
}

export function scheduleArchivedRecipeDeletion(recipeId: string, delayMs = 7_000) {
  const deleteAt = Date.now() + delayMs;
  writePendingDeletions([
    ...pendingDeletions().filter((item) => item.recipeId !== recipeId),
    { recipeId, deleteAt },
  ]);
  const timer = window.setTimeout(() => {
    void permanentlyDeleteArchivedRecipe(recipeId)
      .then(() => removePendingDeletion(recipeId))
      .catch(() => undefined);
  }, delayMs);
  return () => {
    window.clearTimeout(timer);
    removePendingDeletion(recipeId);
  };
}

export async function resumePendingRecipeDeletions() {
  const pending = pendingDeletions();
  for (const item of pending) {
    const remaining = item.deleteAt - Date.now();
    if (remaining <= 0) {
      await permanentlyDeleteArchivedRecipe(item.recipeId);
      removePendingDeletion(item.recipeId);
    } else {
      window.setTimeout(() => {
        void permanentlyDeleteArchivedRecipe(item.recipeId)
          .then(() => removePendingDeletion(item.recipeId))
          .catch(() => undefined);
      }, remaining);
    }
  }
}
