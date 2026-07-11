# Arquitetura — Kooki

- Frontend: React, Vite, Tailwind, componentes locais estilo shadcn, TanStack Query-ready.
- Backend: Supabase Auth/Postgres/Storage/Realtime/Edge Functions.
- IA: OpenRouter somente no backend, saída JSON validada com Zod.
- Fluxo: cliente cria importação; Edge Function valida usuário/limite/URL, extrai, estrutura, valida, salva e registra uso.
- Segurança: RLS por proprietário; cache em `private`; áudio privado; SSRF bloqueado; secrets fora do frontend.
