import { spawn } from "node:child_process";
import { createReadStream, existsSync, promises as fs } from "node:fs";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const maxMediaBytes = 50 * 1024 * 1024;

async function ensureYtDlp() {
  const dir = path.resolve("logs");
  await fs.mkdir(dir, { recursive: true });
  const asset = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const executable = path.join(dir, asset);
  if (!existsSync(executable)) {
    const response = await fetch(
      `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`,
    );
    if (!response.ok)
      throw new Error("Não foi possível preparar o extrator de mídia");
    await fs.writeFile(
      executable,
      new Uint8Array(await response.arrayBuffer()),
    );
    if (process.platform !== "win32") await fs.chmod(executable, 0o755);
  }
  return executable;
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
      if (body.length > 4096) reject(new Error("Payload excessivo"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function runExtractor(executable: string, sourceUrl: string, output: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      executable,
      [
        "--no-playlist",
        "--max-filesize",
        "50M",
        "-f",
        "b[filesize<50M]/b",
        "-o",
        output,
        sourceUrl,
      ],
      { windowsHide: true },
    );
    let error = "";
    child.stderr.on("data", (chunk) => (error += String(chunk)));
    child.on("error", reject);
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Tempo limite do download excedido"));
    }, 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else
        reject(
          new Error(
            error.slice(-500) || `Extrator encerrou com código ${code}`,
          ),
        );
    });
  });
}

async function tryCobalt(sourceUrl: string, output: string) {
  const apiUrl = process.env.COBALT_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return false;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (process.env.COBALT_API_KEY)
    headers.Authorization = `Api-Key ${process.env.COBALT_API_KEY}`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      url: sourceUrl,
      downloadMode: "auto",
      videoQuality: "720",
      filenameStyle: "basic",
      alwaysProxy: true,
    }),
  });
  if (!response.ok)
    throw new Error(
      `Cobalt respondeu ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  const result = (await response.json()) as {
    status?: string;
    url?: string;
    picker?: Array<{ url?: string }>;
  };
  const mediaUrl = result.url ?? result.picker?.find((item) => item.url)?.url;
  if (!mediaUrl)
    throw new Error(
      `Cobalt não retornou mídia utilizável (${result.status ?? "sem status"})`,
    );
  const media = await fetch(new URL(mediaUrl), { redirect: "follow" });
  if (!media.ok)
    throw new Error(`Download do Cobalt respondeu ${media.status}`);
  const declared = Number(media.headers.get("content-length") ?? 0);
  if (declared > maxMediaBytes) throw new Error("Vídeo excede 50 MB");
  const bytes = new Uint8Array(await media.arrayBuffer());
  if (bytes.length > maxMediaBytes) throw new Error("Vídeo excede 50 MB");
  await fs.writeFile(output, bytes);
  return true;
}

async function downloadSocial(sourceUrl: string, output: string) {
  let cobaltError: Error | undefined;
  let downloaded = false;
  try {
    downloaded = await tryCobalt(sourceUrl, output);
  } catch (error) {
    cobaltError = error instanceof Error ? error : new Error("Falha no Cobalt");
  }
  if (!downloaded) {
    try {
      await runExtractor(await ensureYtDlp(), sourceUrl, output);
    } catch (error) {
      throw new Error(
        [
          cobaltError?.message,
          error instanceof Error ? error.message : "Falha no yt-dlp",
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }
  }
}

function mediaExtractor(supabaseUrl: string, publishableKey: string): Plugin {
  return {
    name: "kooki-local-media-extractor",
    configureServer(server) {
      server.middlewares.use(
        "/api/media-extract",
        async (request, response) => {
          let output = "";
          try {
            if (request.method !== "POST")
              throw new Error("Método não permitido");
            const { url } = JSON.parse(await readBody(request)) as {
              url: string;
            };
            const source = new URL(url);
            const host = source.hostname.replace(/^www\./, "");
            if (
              !["instagram.com", "tiktok.com", "vm.tiktok.com"].includes(host)
            ) {
              throw new Error("Plataforma não permitida");
            }
            output = path.join(tmpdir(), `kooki-${crypto.randomUUID()}.mp4`);
            await downloadSocial(source.toString(), output);
            const stat = await fs.stat(output);
            if (stat.size > maxMediaBytes)
              throw new Error("Vídeo excede 50 MB");
            response.statusCode = 200;
            response.setHeader("Content-Type", "video/mp4");
            response.setHeader("Content-Length", String(stat.size));
            const stream = createReadStream(output);
            stream.pipe(response);
            response.on("finish", () => void fs.rm(output, { force: true }));
          } catch (error) {
            if (output)
              await fs.rm(output, { force: true }).catch(() => undefined);
            response.statusCode = 422;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error:
                  error instanceof Error ? error.message : "Falha no download",
              }),
            );
          }
        },
      );
      server.middlewares.use(
        "/api/import-social",
        async (request, response) => {
          let output = "";
          let storagePath = "";
          const authorization = request.headers.authorization;
          try {
            if (
              request.method !== "POST" ||
              !authorization?.startsWith("Bearer ")
            )
              throw new Error("Sessão inválida");
            if (!supabaseUrl || !publishableKey)
              throw new Error("Supabase não configurado no servidor local");
            const { url, replaceRecipeId, idempotencyKey } = JSON.parse(
              await readBody(request),
            ) as {
              url: string;
              replaceRecipeId?: string;
              idempotencyKey?: string;
            };
            const source = new URL(url);
            const host = source.hostname.replace(/^www\./, "");
            if (
              !["instagram.com", "tiktok.com", "vm.tiktok.com"].includes(host)
            )
              throw new Error("Plataforma não permitida");
            const authHeaders = {
              apikey: publishableKey,
              Authorization: authorization,
            };
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: authHeaders,
            });
            if (!userResponse.ok)
              throw new Error("Não foi possível validar sua sessão");
            const user = (await userResponse.json()) as { id: string };
            output = path.join(tmpdir(), `kooki-${crypto.randomUUID()}.mp4`);
            await downloadSocial(source.toString(), output);
            const stat = await fs.stat(output);
            if (stat.size > maxMediaBytes)
              throw new Error("Vídeo excede 50 MB");
            storagePath = `${user.id}/${crypto.randomUUID()}-social-video.mp4`;
            const encodedPath = storagePath
              .split("/")
              .map(encodeURIComponent)
              .join("/");
            const upload = await fetch(
              `${supabaseUrl}/storage/v1/object/recipe-audio/${encodedPath}`,
              {
                method: "POST",
                headers: { ...authHeaders, "Content-Type": "video/mp4" },
                body: new Uint8Array(await fs.readFile(output)),
              },
            );
            if (!upload.ok)
              throw new Error(
                `Falha ao enviar vídeo: ${(await upload.text()).slice(0, 250)}`,
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
            response.statusCode = invocation.status;
            response.setHeader("Content-Type", "application/json");
            response.end(result);
            storagePath = "";
          } catch (error) {
            response.statusCode = 422;
            response.setHeader("Content-Type", "application/json");
            response.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Falha na importação social",
              }),
            );
          } finally {
            if (output)
              await fs.rm(output, { force: true }).catch(() => undefined);
            if (storagePath && authorization)
              await fetch(
                `${supabaseUrl}/storage/v1/object/recipe-audio/${storagePath.split("/").map(encodeURIComponent).join("/")}`,
                {
                  method: "DELETE",
                  headers: {
                    apikey: publishableKey,
                    Authorization: authorization,
                  },
                },
              ).catch(() => undefined);
          }
        },
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      mediaExtractor(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "Kooki — Livro de Receitas Inteligente",
          short_name: "Kooki",
          description: "Receitas organizadas e listas de compras inteligentes.",
          theme_color: "#c5522d",
          background_color: "#fbf8f4",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          navigateFallback: "/",
          globPatterns: ["**/*.{js,css,html,svg,png}"],
        },
      }),
    ],
  };
});
