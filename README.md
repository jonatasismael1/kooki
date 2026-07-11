# Kooki

PWA mobile-first que organiza links, textos e áudios em receitas e listas de compras inteligentes.

## Funcionalidades

- Importação de links, texto, áudio e vídeo com OpenRouter.
- Categorias múltiplas, tags, coleções e favoritos.
- Busca combinada, ajuste de porções e importações recentes.
- Notas, planejamento semanal, compras consolidadas e despensa.
- Histórico de preparo, fotos privadas, compartilhamento revogável.
- Modo Cozinha com timers, leitura em voz alta e comandos de voz quando suportados.

## Executar localmente

Requisitos: Node.js 22+, npm, Docker e Supabase CLI para o backend local.

```bash
npm install
copy .env.example .env.local
npx supabase start
npx supabase db reset
npx supabase functions serve --env-file supabase/functions/.env.local
npm run dev
```

Preencha no frontend apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca use secret/service role em `VITE_*`.

## Supabase

1. Crie/vincule um projeto com `npx supabase link --project-ref SEU_REF`.
2. Aplique migrations com `npx supabase db push`.
3. Configure Google em Authentication > Providers e inclua URLs local/produção na redirect allow list.
4. Magic Link usa o provedor de e-mail do Auth.
5. A migration cria o bucket privado `recipe-audio` (25 MB e MIME types de áudio permitidos).
6. Configure secrets com `npx supabase secrets set --env-file ARQUIVO_LOCAL_NAO_VERSIONADO`.
7. Publique com `npx supabase functions deploy import-recipe` e `npx supabase functions deploy delete-account`.

Secrets das funções: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_STT_MODEL`, `APP_URL`; os adapters reservam `READER_SERVICE_*` e `TRANSCRIPTION_*`. O runtime fornece as credenciais Supabase. Consulte [Auth Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Edge Functions](https://supabase.com/docs/guides/functions) e [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control).

Para download social em produção configure na Netlify:

- `COBALT_API_URL`: URL HTTPS da instância própria do Cobalt.
- `COBALT_API_KEY`: chave da instância, quando exigida.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Qualidade e deploy

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

O artefato `dist/` pode ser publicado em Vercel, Netlify ou Cloudflare Pages com fallback SPA para `index.html`. Configure as variáveis públicas no painel do host.

Na Netlify, `netlify.toml` define build, redirects SPA e a Function `/api/import-social`. Execute `npx netlify deploy --build --prod` após vincular o site.

## Estrutura funcional

- Categoria: classificação descritiva da receita.
- Tag: característica adicional e combinável.
- Coleção: agrupamento pessoal do usuário.
- Planejamento: semana e refeições, sem duplicar receitas.
- Despensa: inventário pessoal usado apenas para sugerir receitas salvas.

Consulte os documentos em `docs/` para regras detalhadas.

## Limitações conhecidas

- YouTube funciona quando o conteúdo textual é acessível; legendas/transcrição exigem adapter e credenciais de provedor.
- Instagram e TikTok são detectados, mas devem cair no fluxo manual quando privados, limitados ou indisponíveis.
- Áudio/vídeo pode ser enviado ao bucket privado (até 100 MB), é transcrito via OpenRouter STT e removido após o processamento.
- A aquisição automática da mídia de Instagram/TikTok é best-effort; quando bloqueada, use a aba **Áudio/Vídeo**.
- Em produção, `import-social` é um proxy leve: envia somente `{ url }` à instância própria configurada em `COBALT_API_URL` e devolve o JSON original do Cobalt. O navegador trata `redirect`, `tunnel` e `picker`, baixa a mídia diretamente, valida o limite de 100 MB e envia ao Storage privado. A Edge Function transcreve e exclui o arquivo em `finally`.
- O endpoint local `/api/media-extract` mantém `yt-dlp` como ferramenta de diagnóstico/fallback; a rota usada pela interface (`/api/import-social`) segue o mesmo contrato JSON da produção.
- A Netlify está conectada ao branch `main` do GitHub; cada `git push` inicia build e deploy contínuos.
- Sem Supabase configurado, a UI abre vazia somente para inspeção; salvar informa claramente a configuração ausente e não exibe dados falsos.
