type CobaltError = {
  status: "error";
  error: { code: string; context?: unknown };
};

const allowedHosts = new Set([
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
]);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default async (request: Request) => {
  if (request.method !== "POST")
    return json({ status: "error", error: { code: "error.api.method" } }, 405);
  if (!request.headers.get("Authorization")?.startsWith("Bearer "))
    return json(
      { status: "error", error: { code: "error.api.unauthorized" } },
      401,
    );

  const cobaltUrl = process.env.COBALT_API_URL?.replace(/\/+$/, "");
  if (!cobaltUrl)
    return json(
      { status: "error", error: { code: "error.api.cobalt_not_configured" } },
      503,
    );

  try {
    const { url } = (await request.json()) as { url?: string };
    if (!url)
      return json(
        { status: "error", error: { code: "error.api.invalid_body" } },
        400,
      );
    const source = new URL(url);
    if (!allowedHosts.has(source.hostname.toLowerCase()))
      return json(
        { status: "error", error: { code: "error.api.unsupported_service" } },
        400,
      );

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (process.env.COBALT_API_KEY)
      headers.Authorization = `Api-Key ${process.env.COBALT_API_KEY}`;

    const response = await fetch(`${cobaltUrl}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: source.toString(),
        downloadMode: "audio",
        audioFormat: "mp3",
        audioBitrate: "64",
      }),
    });
    const payload = (await response.json()) as
      CobaltError | Record<string, unknown>;
    console.info(
      JSON.stringify({
        event: "cobalt_response",
        stage: "request_audio",
        httpStatus: response.status,
        status: payload.status,
        filename: "filename" in payload ? payload.filename : undefined,
        pickerCount:
          "picker" in payload && Array.isArray(payload.picker)
            ? payload.picker.length
            : 0,
        errorCode:
          "error" in payload && payload.error && typeof payload.error === "object"
            ? (payload.error as { code?: string }).code
            : undefined,
      }),
    );
    return json(payload, response.status);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "cobalt_failure",
        stage: "request_audio",
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    return json(
      { status: "error", error: { code: "error.api.fetch.empty" } },
      502,
    );
  }
};
