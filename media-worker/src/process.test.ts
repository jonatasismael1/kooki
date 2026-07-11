import { describe, expect, it } from "vitest";
import { normalizeCobaltTunnelUrl } from "./cobalt-url.js";
describe("Cobalt tunnel", () => {
  it("troca somente a origem e preserva caminho e assinatura", () => expect(normalizeCobaltTunnelUrl(
    "https://old.example/tunnel?id=abc&sig=xyz", "https://kooki.up.railway.app/",
  )).toBe("https://kooki.up.railway.app/tunnel?id=abc&sig=xyz"));
});
