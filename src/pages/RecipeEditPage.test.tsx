// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeEditPage } from "./RecipeEditPage";
import { loadRecipeForEditing, saveRecipeRevision } from "../lib/recipe-revisions";
import type { RecipeRecord } from "../lib/recipes";

vi.mock("../lib/recipe-revisions", () => ({
  loadRecipeForEditing: vi.fn(),
  saveRecipeRevision: vi.fn(),
}));
vi.mock("../components/feedback-events", () => ({ notify: vi.fn() }));

const recipe: RecipeRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  import_job_id: "22222222-2222-4222-8222-222222222222",
  title: "Bolo de cenoura",
  description: "Receita gerada",
  servings: 8,
  status: "needs_review",
  source_platform: "blog",
  source_url: null,
  parsing_confidence: "low",
  warnings: ["Rendimento não identificado", "Confira as etapas de preparo"],
  created_at: "2026-07-13T10:00:00.000Z",
  recipe_ingredients: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Cenoura",
      normalized_name: "cenoura",
      quantity: 3,
      quantity_text: "3 unidades",
      unit: "unidade",
      normalized_unit: "unidade",
      notes: null,
      sector: "Hortifrúti",
      position: 0,
    },
  ],
  recipe_steps: [
    { id: "44444444-4444-4444-8444-444444444444", instruction: "Misture.", position: 0 },
    { id: "55555555-5555-4555-8555-555555555555", instruction: "Asse.", position: 1 },
  ],
};

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={[`/receitas/${recipe.id}/editar`]}>
      <Routes>
        <Route path="/receitas/:id/editar" element={<RecipeEditPage />} />
        <Route path="/receitas/:id" element={<div>Detalhe da receita</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(loadRecipeForEditing).mockResolvedValue(recipe);
  vi.mocked(saveRecipeRevision).mockResolvedValue({ ...recipe, status: "ready" });
});

afterEach(cleanup);

describe("editor dedicado de receita", () => {
  it("destaca avisos nos campos correspondentes", async () => {
    renderEditor();
    expect(await screen.findByText("Rendimento não identificado")).toBeVisible();
    expect(screen.getByText("Confira as etapas de preparo")).toBeVisible();
  });

  it("reordena etapas e envia a nova ordem ao salvar", async () => {
    renderEditor();
    await screen.findByDisplayValue("Bolo de cenoura");
    fireEvent.click(screen.getByRole("button", { name: "Mover etapa 2 para cima" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(saveRecipeRevision).toHaveBeenCalledOnce());
    const snapshot = vi.mocked(saveRecipeRevision).mock.calls[0][1];
    expect(snapshot.steps.map((step) => step.instruction)).toEqual(["Asse.", "Misture."]);
  });

  it("salva alterações como rascunho automaticamente", async () => {
    renderEditor();
    const title = await screen.findByLabelText("Título da receita");
    fireEvent.change(title, { target: { value: "Bolo revisado" } });

    await waitFor(
      () => {
        const stored = localStorage.getItem(`kooki-recipe-draft:${recipe.id}`);
        expect(stored).toContain("Bolo revisado");
      },
      { timeout: 1_500 },
    );
  });
});
