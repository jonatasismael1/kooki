// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeVersionHistory } from "./recipe-version-history";
import { loadRecipeVersions, saveRecipeRevision } from "../lib/recipe-revisions";
import type { RecipeRecord, RecipeVersion } from "../lib/recipes";

vi.mock("../lib/recipe-revisions", () => ({
  loadRecipeVersions: vi.fn(),
  saveRecipeRevision: vi.fn(),
}));
vi.mock("./feedback-events", () => ({ notify: vi.fn() }));

const recipe = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Bolo editado",
  description: null,
  servings: 8,
  status: "ready",
  source_platform: "blog",
  created_at: "2026-07-13T10:00:00.000Z",
  recipe_ingredients: [],
  recipe_steps: [],
} satisfies RecipeRecord;

const version: RecipeVersion = {
  id: "22222222-2222-4222-8222-222222222222",
  recipe_id: recipe.id,
  kind: "original_ai",
  label: "Receita original gerada pela IA",
  created_at: "2026-07-13T09:00:00.000Z",
  snapshot: {
    title: "Bolo original",
    description: null,
    servings: 8,
    status: "needs_review",
    ingredients: [],
    steps: [],
  },
};

beforeEach(() => {
  vi.mocked(loadRecipeVersions).mockResolvedValue([version]);
  vi.mocked(saveRecipeRevision).mockResolvedValue({ ...recipe, title: "Bolo original" });
});

afterEach(cleanup);

describe("histórico de versões", () => {
  it("restaura uma versão e devolve a receita atualizada", async () => {
    const onRestored = vi.fn();
    render(<RecipeVersionHistory recipe={recipe} onRestored={onRestored} />);

    expect(await screen.findByText("Receita original gerada pela IA")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    fireEvent.click(screen.getByRole("button", { name: "Restaurar versão" }));

    await waitFor(() => expect(saveRecipeRevision).toHaveBeenCalledWith(recipe, version.snapshot));
    expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ title: "Bolo original" }));
  });
});
