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

- [~] Fase 1 — Banco e vínculos múltiplos concluídos; gestão/combinação completa de filtros pendente.
- [~] Fase 2 — Coleções, notas, duplicidade e inbox básicos; edição/reordenação e ações do inbox pendentes.
- [~] Fase 3 — Escala, semana e compras básicas; cópias, refeição manual, reordenação e lista persistente pendentes.
- [~] Fase 4 — Timers, histórico e fotos básicos; formulários completos, edição, capa e fotos por sessão pendentes.
- [~] Fase 5 — Voz/leitura e persistência local; notificação e todos os comandos de timer pendentes.
- [~] Fase 6 — Cadastro mínimo e sugestões; gestão completa e desconto confirmado da despensa pendentes.
- [~] Fase 7 — Link público/revogação/cópia básicos; link privado, texto, visual e compras no compartilhado pendentes.
- [~] Release — GitHub, Netlify e deploy contínuo concluídos; auditoria funcional ampla permanece em andamento.

## Decisões

- Preservar tabelas `categories` e `recipe_categories`; evoluir sem apagar relações.
- Categorias do sistema têm `user_id = null`; categorias personalizadas pertencem ao usuário.
- Compartilhamento público será entregue por Edge Function, evitando expor tabelas privadas ao papel `anon`.
- Quantidades originais permanecem imutáveis; escala ocorre no cliente.
- Cobalt próprio será o extrator de produção; `yt-dlp` é fallback de desenvolvimento.

## Riscos

- Netlify Functions não baixa mais arquivos: funciona apenas como proxy JSON e solicita áudio MP3 a 64 kbps ao Cobalt externo, evitando estouro de compute/memória.
- O caminho social limita a transcrição a 32 MB e 60 minutos estimados; logs estruturados identificam tamanho, duração e etapa da falha.
- Downloads diretos no navegador dependem de CORS no destino; túneis da instância Cobalt atual respondem com `Access-Control-Allow-Origin: *`.
- APIs de voz, Wake Lock e notificações variam por navegador e precisam de fallback manual.
- Fotos e mídia exigem limites, MIME real e URLs assinadas.
- Mudanças amplas exigem validação RLS integrada antes da publicação.
