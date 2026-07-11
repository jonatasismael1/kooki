# Plano de implementação — Kooki

## Estado atual

- React/Vite/TypeScript mobile-first, PWA, Supabase Auth/Postgres/Storage/Edge Functions e OpenRouter.
- Importação por texto/link/áudio/vídeo; Instagram/TikTok local usa Cobalt configurável ou `yt-dlp`, depois OpenRouter STT.
- Acervo, Modo Cozinha básico, compras, temas, feedback global, RLS inicial e plano gratuito.
- Repositório local ainda sem histórico Git no início desta fase.

## Lacunas da evolução

- Organização avançada, favoritos, porções, duplicidade e caixa de importações.
- Planejamento, notas, histórico, timers, voz, despensa, sugestões e compartilhamento.
- Fotos próprias, documentação e arquitetura de comunidade.
- Extração social em produção depende de instância Cobalt própria acessível por HTTPS.

## Migrations

- [x] Planejada migration compatível para evoluir categorias existentes.
- [x] Planejadas tags, coleções, notas, planejamento, histórico, despensa, compartilhamento e fotos.
- [x] Planejadas policies RLS e buckets privados.
- [x] Aplicar migration hospedada.

## Fases

- [x] Fase 1 — Banco, categorias, tags, favoritos e filtros.
- [x] Fase 2 — Coleções, notas, duplicidade e importações.
- [x] Fase 3 — Porções, planejamento e compras.
- [x] Fase 4 — Temporizadores, histórico e fotos.
- [x] Fase 5 — Voz, leitura e timers persistentes com fallback por navegador.
- [x] Fase 6 — Despensa e sugestões.
- [x] Fase 7 — Compartilhamento e arquitetura futura.
- [ ] Release — documentação, validações, GitHub e Netlify.

## Decisões

- Preservar tabelas `categories` e `recipe_categories`; evoluir sem apagar relações.
- Categorias do sistema têm `user_id = null`; categorias personalizadas pertencem ao usuário.
- Compartilhamento público será entregue por Edge Function, evitando expor tabelas privadas ao papel `anon`.
- Quantidades originais permanecem imutáveis; escala ocorre no cliente.
- Cobalt próprio será o extrator de produção; `yt-dlp` é fallback de desenvolvimento.

## Riscos

- Netlify Functions não é ambiente apropriado para executar binário `yt-dlp`; exige Cobalt externo.
- APIs de voz, Wake Lock e notificações variam por navegador e precisam de fallback manual.
- Fotos e mídia exigem limites, MIME real e URLs assinadas.
- Mudanças amplas exigem validação RLS integrada antes da publicação.
