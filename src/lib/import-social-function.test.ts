import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../netlify/functions/import-social";

describe("Netlify import-social", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.COBALT_API_URL;
  });

  it("solicita áudio MP3 leve e devolve o JSON do Cobalt", async () => {
    process.env.COBALT_API_URL = "https://cobalt.example/";
    const cobaltJson = {
      status: "tunnel",
      url: "https://cobalt.example/tunnel?id=1",
      filename: "receita.mp4",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(cobaltJson), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handler(
      new Request("https://kooki.test/api/import-social", {
        method: "POST",
        headers: {
          Authorization: "Bearer session",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "https://www.instagram.com/reel/abc/",
          ignored: "não deve chegar ao Cobalt",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(cobaltJson);
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      url: "https://www.instagram.com/reel/abc/",
      downloadMode: "audio",
      audioFormat: "mp3",
      audioBitrate: "64",
    });
  });
});
