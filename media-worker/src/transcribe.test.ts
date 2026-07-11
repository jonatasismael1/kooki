import { describe, expect, it } from "vitest";
import { mergeTranscripts } from "./merge.js";
describe("segmentos", () => {
  it("remove sobreposição evidente das bordas", () => expect(mergeTranscripts([
    "misture a farinha e os ovos até ficar uniforme", "os ovos até ficar uniforme depois asse por trinta minutos",
  ])).toBe("misture a farinha e os ovos até ficar uniforme depois asse por trinta minutos"));
});
