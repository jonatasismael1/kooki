import { describe, expect, it } from "vitest";
import { importErrorMessage, importStatusLabel, pantryStatusLabel, platformLabel } from "./import-status";

describe("textos de importação", () => {
  it("traduz estados técnicos para português", () => {
    expect(importStatusLabel("needs_manual_input")).toBe("Precisa de conteúdo manual");
    expect(importStatusLabel("failed")).toBe("Falhou");
    expect(pantryStatusLabel("available")).toBe("Disponível");
  });

  it("traduz plataformas conhecidas", () => {
    expect(platformLabel("youtube")).toBe("YouTube");
    expect(platformLabel(null)).toBe("Receita");
  });

  it("explica erros conhecidos em linguagem acionável", () => {
    expect(importErrorMessage("error.api.fetch.empty")).toContain("conteúdo suficiente");
    expect(importErrorMessage("Failed to fetch")).toContain("conexão falhou");
  });
});
