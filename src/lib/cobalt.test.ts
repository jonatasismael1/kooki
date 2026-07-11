import { describe, expect, it } from "vitest";
import {
  cobaltErrorMessage,
  inferMediaType,
  isTranscribableMedia,
  selectCobaltMedia,
} from "./cobalt";

describe("Cobalt", () => {
  it.each(["redirect", "tunnel"] as const)("aceita resposta %s", (status) => {
    expect(
      selectCobaltMedia({
        status,
        url: "https://media.test/video",
        filename: "receita.mp4",
      }),
    ).toEqual({
      url: "https://media.test/video",
      filename: "receita.mp4",
    });
  });

  it("prioriza vídeo no picker", () => {
    expect(
      selectCobaltMedia({
        status: "picker",
        picker: [
          { type: "photo", url: "https://media.test/photo" },
          { type: "video", url: "https://media.test/video" },
        ],
      }).url,
    ).toBe("https://media.test/video");
  });

  it("usa áudio de slideshow quando não há vídeo", () => {
    expect(
      selectCobaltMedia({ status: "picker", audio: "https://media.test/audio" })
        .url,
    ).toBe("https://media.test/audio");
  });

  it("traduz erro vazio e rejeita imagem", () => {
    expect(cobaltErrorMessage("error.api.fetch.empty")).toContain(
      "não encontrou mídia",
    );
    expect(isTranscribableMedia("image/jpeg", "capa.jpg")).toBe(false);
    expect(inferMediaType("application/octet-stream", "receita.mp4")).toBe(
      "video/mp4",
    );
  });
});
