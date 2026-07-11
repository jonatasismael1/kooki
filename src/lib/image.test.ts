import { describe, expect, it } from "vitest";
import { hasValidImageSignature } from "./image";

describe("segurança de imagens", () => {
  it("aceita assinaturas reais", () => {
    expect(
      hasValidImageSignature("image/jpeg", new Uint8Array([255, 216, 255])),
    ).toBe(true);
    expect(
      hasValidImageSignature(
        "image/png",
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      ),
    ).toBe(true);
  });

  it("rejeita MIME declarado com conteúdo falso", () => {
    expect(
      hasValidImageSignature("image/png", new TextEncoder().encode("<script>")),
    ).toBe(false);
  });
});
