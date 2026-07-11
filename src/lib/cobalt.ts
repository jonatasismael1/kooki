export type CobaltPickerItem = {
  type: "photo" | "video" | "gif";
  url: string;
  thumb?: string;
};

export type CobaltResponse = {
  status: "tunnel" | "redirect" | "picker" | "local-processing" | "error";
  url?: string;
  filename?: string;
  picker?: CobaltPickerItem[];
  audio?: string;
  audioFilename?: string;
  error?: { code?: string; context?: unknown };
};

export function selectCobaltMedia(result: CobaltResponse) {
  if (
    (result.status === "redirect" || result.status === "tunnel") &&
    result.url
  )
    return { url: result.url, filename: result.filename ?? "social-video.mp4" };

  if (result.status === "picker") {
    if (result.audio)
      return {
        url: result.audio,
        filename: result.audioFilename ?? "social-audio.mp3",
      };
    const video = result.picker?.find((item) => item.type === "video");
    if (video) return { url: video.url, filename: "social-video.mp4" };
  }

  if (result.status === "error")
    throw new Error(cobaltErrorMessage(result.error?.code));
  throw new Error("O Cobalt não retornou vídeo ou áudio utilizável.");
}

export function cobaltErrorMessage(code?: string) {
  const messages: Record<string, string> = {
    "error.api.fetch.empty":
      "O Cobalt não encontrou mídia nesse link. Confirme se o conteúdo é público e tente novamente.",
    "error.api.invalid_body": "O Cobalt rejeitou o formato da solicitação.",
    "error.api.unsupported_service":
      "Esse serviço não é compatível com a importação.",
    "error.api.cobalt_not_configured":
      "O Cobalt ainda não foi configurado na Netlify.",
    "error.api.unauthorized": "Sua sessão expirou. Entre novamente.",
  };
  return messages[code ?? ""] ?? `Falha no Cobalt${code ? `: ${code}` : ""}`;
}

export function isTranscribableMedia(contentType: string, filename: string) {
  if (contentType.startsWith("video/") || contentType.startsWith("audio/"))
    return true;
  return /\.(mp4|webm|mov|m4v|mp3|m4a|wav|ogg|opus)$/i.test(filename);
}

export function inferMediaType(contentType: string, filename: string) {
  if (contentType.startsWith("video/") || contentType.startsWith("audio/"))
    return contentType;
  const extension = filename.split(".").pop()?.toLowerCase();
  return (
    {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      m4v: "video/mp4",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      wav: "audio/wav",
      ogg: "audio/ogg",
      opus: "audio/ogg",
    }[extension ?? ""] ?? contentType
  );
}

export function estimateAudioDurationSeconds(sizeBytes: number, bitrateKbps = 64) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || bitrateKbps <= 0) return null;
  return Math.ceil((sizeBytes * 8) / (bitrateKbps * 1000));
}

export function resourceFallbackMessage(message: string) {
  if (!/(compute|memory|resource|worker|cpu|limit|too large|excede)/i.test(message))
    return message;
  return "Não foi possível transcrever dentro do limite de recursos. Tente novamente, use a legenda ou cole o texto manualmente.";
}
