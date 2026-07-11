# AGENTS.md — Kooki

Projeto: SaaS/PWA de receitas com React, Vite, TypeScript, Supabase e OpenRouter. Leia `PRD_Kooki_MVP.md`, `IMPLEMENTATION_PLAN.md` e `docs/context/` antes de alterar.

- Nunca crie, copie ou exponha secrets; service role e OpenRouter ficam exclusivamente nas Edge Functions.
- Mantenha RLS em todas as tabelas expostas e o cache no schema privado.
- Preserve TypeScript estrito, mobile-first, estados de erro/loading/vazio e textos em português.
- Não prometa captura garantida de Instagram/TikTok nem converta unidades sem fator comprovado.
- Valide com `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
