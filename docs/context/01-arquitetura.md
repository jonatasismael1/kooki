# Arquitetura — Kooki

- Frontend: React, Vite, Tailwind, componentes locais estilo shadcn, TanStack Query-ready.
- Backend: Supabase Auth/Postgres/Storage/Realtime/Edge Functions.
- IA: OpenRouter somente no backend, saída JSON validada com Zod.
- Fluxo de mídia: cliente envia upload diretamente ao Storage e chama a Edge Function; ela autentica, valida, enfileira e responde 202. O `kooki-media-worker` faz claim com lease, usa Cobalt/ffmpeg por streaming, transcreve segmentos e salva a receita.
- Segurança: RLS por proprietário; cache em `private`; áudio privado; SSRF bloqueado; secrets fora do frontend.
