const importStatusLabels: Record<string, string> = {
  pending: "Na fila",
  validating: "Validando",
  checking_limit: "Verificando limite",
  checking_cache: "Buscando no cache",
  extracting: "Extraindo conteúdo",
  transcribing: "Transcrevendo",
  structuring: "Organizando receita",
  validating_output: "Validando receita",
  saving: "Salvando",
  needs_manual_input: "Precisa de conteúdo manual",
  needs_review: "Precisa de revisão",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

const pantryStatusLabels: Record<string, string> = {
  available: "Disponível",
  low: "Baixo",
  out: "Acabou",
  expired: "Vencido",
  archived: "Arquivado",
};

const platformLabels: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  blog: "Blog",
  manual: "Manual",
  audio: "Áudio",
};

const knownImportErrors: Array<[RegExp, string]> = [
  [/error\.api\.fetch\.empty/i, "A fonte não entregou conteúdo suficiente. Cole a legenda, envie o áudio ou tente outro link."],
  [/error\.api\.invalid_body/i, "O serviço rejeitou esse link. Confira o endereço e tente novamente."],
  [/error\.api\.unsupported_service/i, "Essa plataforma ainda não é compatível com importação automática."],
  [/error\.api\.cobalt_not_configured/i, "O serviço de captura de vídeo não está configurado."],
  [/unauthorized|jwt|sess[aã]o/i, "Sua sessão expirou. Entre novamente e tente importar outra vez."],
  [/network|fetch|failed to fetch/i, "A conexão falhou durante a captura. A importação pode ser retomada ou refeita."],
  [/private|indispon[ií]vel|forbidden|403/i, "O conteúdo parece privado ou indisponível. Use legenda, texto manual ou áudio."],
  [/timeout|timed out/i, "O processamento demorou mais que o esperado. Tente novamente ou use o modo manual."],
];

export function importStatusLabel(status?: string | null) {
  if (!status) return "Aguardando";
  return importStatusLabels[status] ?? status;
}

export function pantryStatusLabel(status?: string | null) {
  if (!status) return "Sem estado";
  return pantryStatusLabels[status] ?? status;
}

export function platformLabel(platform?: string | null) {
  if (!platform) return "Receita";
  return platformLabels[platform] ?? platform;
}

export function importErrorMessage(message?: string | null) {
  if (!message?.trim()) return "";
  const clean = message.trim();
  const mapped = knownImportErrors.find(([pattern]) => pattern.test(clean));
  return mapped?.[1] ?? clean;
}

export const importStatusFilterOptions = [
  "extracting",
  "transcribing",
  "structuring",
  "completed",
  "needs_review",
  "needs_manual_input",
  "failed",
  "cancelled",
] as const;

export const pantryStatusFilterOptions = ["available", "low", "out", "expired"] as const;
