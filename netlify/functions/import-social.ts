const maxBytes = 50 * 1024 * 1024;
export default async (request: Request) => {
  if (request.method !== "POST")
    return Response.json({ error: "Método não permitido" }, { status: 405 });
  const authorization = request.headers.get("Authorization");
  if (!authorization)
    return Response.json({ error: "Sessão inválida" }, { status: 401 });
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const cobaltUrl = process.env.COBALT_API_URL?.replace(/\/$/, "");
  if (!supabaseUrl || !publishableKey)
    return Response.json(
      { error: "Supabase não configurado" },
      { status: 500 },
    );
  if (!cobaltUrl)
    return Response.json(
      {
        error:
          "O extrator Cobalt próprio ainda não foi configurado em produção. Configure COBALT_API_URL na Netlify.",
      },
      { status: 503 },
    );
  try {
    const { url, replaceRecipeId, idempotencyKey } = (await request.json()) as {
      url: string;
      replaceRecipeId?: string;
      idempotencyKey?: string;
    };
    const source = new URL(url);
    const host = source.hostname.replace(/^www\./, "");
    if (!["instagram.com", "tiktok.com", "vm.tiktok.com"].includes(host))
      throw new Error("Plataforma não permitida");
    const cobaltHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (process.env.COBALT_API_KEY)
      cobaltHeaders.Authorization = `Api-Key ${process.env.COBALT_API_KEY}`;
    const cobalt = await fetch(cobaltUrl, {
      method: "POST",
      headers: cobaltHeaders,
      body: JSON.stringify({
        url: source.toString(),
        downloadMode: "auto",
        videoQuality: "720",
        filenameStyle: "basic",
        alwaysProxy: true,
      }),
    });
    if (!cobalt.ok)
      throw new Error(
        `Cobalt respondeu ${cobalt.status}: ${(await cobalt.text()).slice(0, 250)}`,
      );
    const extracted = (await cobalt.json()) as {
      url?: string;
      picker?: Array<{ url?: string }>;
      status?: string;
    };
    const mediaUrl =
      extracted.url ?? extracted.picker?.find((item) => item.url)?.url;
    if (!mediaUrl)
      throw new Error(
        `Cobalt não retornou vídeo (${extracted.status ?? "sem status"})`,
      );
    const media = await fetch(mediaUrl);
    if (!media.ok) throw new Error(`Download respondeu ${media.status}`);
    const declared = Number(media.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new Error("Vídeo excede 50 MB");
    const bytes = new Uint8Array(await media.arrayBuffer());
    if (bytes.length > maxBytes) throw new Error("Vídeo excede 50 MB");
    const authHeaders = {
      apikey: publishableKey,
      Authorization: authorization,
    };
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: authHeaders,
    });
    if (!userResponse.ok) throw new Error("Sessão expirada");
    const user = (await userResponse.json()) as { id: string };
    const storagePath = `${user.id}/${crypto.randomUUID()}-social-video.mp4`;
    const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
    const upload = await fetch(
      `${supabaseUrl}/storage/v1/object/recipe-audio/${encoded}`,
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "video/mp4" },
        body: bytes,
      },
    );
    if (!upload.ok)
      throw new Error(
        `Upload respondeu ${upload.status}: ${(await upload.text()).slice(0, 200)}`,
      );
    const invocation = await fetch(
      `${supabaseUrl}/functions/v1/import-recipe`,
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "url",
          sourceUrl: source.toString(),
          audioPath: storagePath,
          replaceRecipeId,
          idempotencyKey,
        }),
      },
    );
    const result = await invocation.text();
    return new Response(result, {
      status: invocation.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Falha na importação social",
      },
      { status: 422 },
    );
  }
};
