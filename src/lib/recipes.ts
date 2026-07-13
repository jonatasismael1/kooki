import type { IngredientInput } from "./shopping";

export type RecipeIngredient = IngredientInput & {
  id: string;
  quantity_text: string | null;
  unit?: string | null;
  notes: string | null;
  sector: string;
  position: number;
};

export type RecipeStep = {
  id: string;
  instruction: string;
  position: number;
};

export type RecipeRecord = {
  id: string;
  import_job_id?: string | null;
  title: string;
  description: string | null;
  servings: number | null;
  status: string;
  source_platform: string | null;
  source_url?: string | null;
  parsing_confidence?: "high" | "medium" | "low" | null;
  warnings?: string[] | null;
  is_favorite?: boolean;
  created_at: string;
  recipe_ingredients?: RecipeIngredient[];
  recipe_steps?: RecipeStep[];
};

export type RecipeEditDraft = {
  title: string;
  description: string;
  servings: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipeSnapshot = {
  title: string;
  description: string | null;
  servings: number | null;
  status: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipeVersion = {
  id: string;
  recipe_id: string;
  kind: "original_ai" | "manual";
  label: string;
  snapshot: RecipeSnapshot;
  created_at: string;
};

export type ReviewField = "title" | "description" | "servings" | "ingredients" | "steps";
export type ReviewHints = Partial<Record<ReviewField, string[]>> & { general?: string[] };

export function recipeToDraft(recipe: RecipeRecord): RecipeEditDraft {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    servings: recipe.servings?.toString() ?? "",
    ingredients: [...(recipe.recipe_ingredients ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ingredient) => ({ ...ingredient })),
    steps: [...(recipe.recipe_steps ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((step) => ({ ...step })),
  };
}

export function draftToSnapshot(
  draft: RecipeEditDraft,
  originalIngredients: RecipeIngredient[] = [],
): RecipeSnapshot {
  const originalById = new Map(originalIngredients.map((ingredient) => [ingredient.id, ingredient]));
  const servings = draft.servings ? Number(draft.servings) : null;

  if (!draft.title.trim()) throw new Error("Informe o título da receita.");
  if (servings !== null && (!Number.isFinite(servings) || servings <= 0)) {
    throw new Error("Informe uma quantidade de porções maior que zero.");
  }

  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    servings,
    status: "ready",
    ingredients: draft.ingredients
      .filter((ingredient) => ingredient.name.trim())
      .map((ingredient, position) => {
        const original = originalById.get(ingredient.id);
        const quantityText = ingredient.quantity_text?.trim() || null;
        const quantityChanged = quantityText !== (original?.quantity_text ?? null);
        return {
          ...ingredient,
          name: ingredient.name.trim(),
          normalized_name: ingredient.name.trim().toLocaleLowerCase("pt-BR"),
          quantity_text: quantityText,
          quantity: quantityChanged ? null : (original?.quantity ?? ingredient.quantity),
          unit: quantityChanged ? null : (original?.unit ?? ingredient.unit ?? null),
          normalized_unit: quantityChanged
            ? null
            : (original?.normalized_unit ?? ingredient.normalized_unit),
          notes: ingredient.notes?.trim() || null,
          sector: ingredient.sector || "Outros",
          position,
        };
      }),
    steps: draft.steps
      .filter((step) => step.instruction.trim())
      .map((step, position) => ({ ...step, instruction: step.instruction.trim(), position })),
  };
}

export function recipeToSnapshot(recipe: RecipeRecord): RecipeSnapshot {
  return draftToSnapshot(recipeToDraft(recipe), recipe.recipe_ingredients);
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function getReviewHints(recipe: RecipeRecord): ReviewHints {
  const hints: ReviewHints = {};
  const warnings = recipe.warnings?.filter(Boolean) ?? [];
  const mappings: Array<[ReviewField, RegExp]> = [
    ["title", /titulo|nome da receita/],
    ["description", /descricao|resumo/],
    ["servings", /porcao|porcoes|rendimento/],
    ["ingredients", /ingrediente|quantidade|unidade|medida/],
    ["steps", /etapa|preparo|instrucao|modo de fazer/],
  ];

  for (const warning of warnings) {
    const warningNormalized = normalized(warning);
    const fields = mappings.filter(([, pattern]) => pattern.test(warningNormalized));
    if (!fields.length) {
      hints.general = [...(hints.general ?? []), warning];
      continue;
    }
    for (const [field] of fields) hints[field] = [...(hints[field] ?? []), warning];
  }

  if (recipe.parsing_confidence === "low") {
    if (!recipe.title.trim() || /^receita( sem titulo)?$/i.test(recipe.title.trim())) {
      hints.title = [...(hints.title ?? []), "Confira se o título identifica bem a receita."];
    }
    if (!recipe.recipe_ingredients?.length) {
      hints.ingredients = [...(hints.ingredients ?? []), "Nenhum ingrediente foi identificado."];
    }
    if (!recipe.recipe_steps?.length) {
      hints.steps = [...(hints.steps ?? []), "Nenhuma etapa de preparo foi identificada."];
    }
  }

  return hints;
}

const draftPrefix = "kooki-recipe-draft:";

export function saveRecipeDraft(recipeId: string, draft: RecipeEditDraft) {
  localStorage.setItem(`${draftPrefix}${recipeId}`, JSON.stringify({ draft, savedAt: Date.now() }));
}

export function loadRecipeDraft(recipeId: string): RecipeEditDraft | null {
  try {
    const stored = JSON.parse(localStorage.getItem(`${draftPrefix}${recipeId}`) ?? "null") as {
      draft?: RecipeEditDraft;
    } | null;
    return stored?.draft ?? null;
  } catch {
    return null;
  }
}

export function clearRecipeDraft(recipeId: string) {
  localStorage.removeItem(`${draftPrefix}${recipeId}`);
}

export function draftFingerprint(draft: RecipeEditDraft) {
  return JSON.stringify(draft);
}
