// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRecipeDraft,
  draftToSnapshot,
  getReviewHints,
  loadRecipeDraft,
  moveItem,
  saveRecipeDraft,
  type RecipeEditDraft,
  type RecipeRecord,
} from "./recipes";

const draft: RecipeEditDraft = {
  title: " Bolo ",
  description: " teste ",
  servings: "8",
  ingredients: [
    {
      id: "1",
      name: " Farinha ",
      normalized_name: "farinha",
      quantity_text: "2 xícaras",
      quantity: 2,
      unit: "xícara",
      normalized_unit: "xicara",
      notes: null,
      sector: "Mercearia",
      position: 0,
    },
  ],
  steps: [{ id: "2", instruction: " Misture. ", position: 0 }],
};

beforeEach(() => localStorage.clear());

describe("edição de receitas", () => {
  it("normaliza o rascunho sem converter uma quantidade textual alterada", () => {
    const snapshot = draftToSnapshot(draft, [{ ...draft.ingredients[0], quantity_text: "1 xícara" }]);
    expect(snapshot.title).toBe("Bolo");
    expect(snapshot.ingredients[0].quantity).toBeNull();
    expect(snapshot.ingredients[0].unit).toBeNull();
  });

  it("preserva a quantidade estruturada quando o texto não mudou", () => {
    const snapshot = draftToSnapshot(draft, draft.ingredients);
    expect(snapshot.ingredients[0].quantity).toBe(2);
    expect(snapshot.ingredients[0].unit).toBe("xícara");
  });

  it("reordena itens sem mutar a lista original", () => {
    const original = ["a", "b", "c"];
    expect(moveItem(original, 2, 0)).toEqual(["c", "a", "b"]);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("associa avisos aos campos correspondentes", () => {
    const recipe = {
      title: "Receita",
      warnings: ["Quantidade de ingredientes incompleta", "Rendimento não identificado"],
      parsing_confidence: "low",
      recipe_ingredients: [],
      recipe_steps: [],
    } as RecipeRecord;
    const hints = getReviewHints(recipe);
    expect(hints.ingredients).toContain("Quantidade de ingredientes incompleta");
    expect(hints.servings).toContain("Rendimento não identificado");
    expect(hints.steps).toContain("Nenhuma etapa de preparo foi identificada.");
  });

  it("salva, recupera e limpa o rascunho local", () => {
    saveRecipeDraft("recipe-1", draft);
    expect(loadRecipeDraft("recipe-1")?.title).toBe(" Bolo ");
    clearRecipeDraft("recipe-1");
    expect(loadRecipeDraft("recipe-1")).toBeNull();
  });
});
