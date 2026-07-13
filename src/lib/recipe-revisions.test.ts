// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocalRecipe, saveLocalRecipe } from "./local-store";
import {
  archiveRecipe,
  scheduleArchivedRecipeDeletion,
  undoArchiveRecipe,
} from "./recipe-revisions";

vi.mock("./supabase", () => ({ supabase: null }));

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe("exclusão reversível", () => {
  it("arquiva imediatamente e permite desfazer antes da exclusão definitiva", async () => {
    vi.useFakeTimers();
    const recipe = saveLocalRecipe({ title: "Bolo" });
    await archiveRecipe(recipe.id);
    const cancel = scheduleArchivedRecipeDeletion(recipe.id, 1_000);

    expect(getLocalRecipe(recipe.id)?.status).toBe("archived");
    cancel();
    await undoArchiveRecipe(recipe.id, "ready");
    await vi.advanceTimersByTimeAsync(1_000);

    expect(getLocalRecipe(recipe.id)?.status).toBe("ready");
  });
});
