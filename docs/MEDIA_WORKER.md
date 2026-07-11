# Kooki Media Worker

Worker Node portátil que usa PostgreSQL/Supabase como fila, Cobalt como extrator e ffmpeg/ffprobe para normalização e segmentação. Não recebe chamadas do navegador e não depende de APIs específicas do Railway.

Healthcheck publicado: `https://kooki-media-worker-production.up.railway.app/health`.

## Configuração

Copie `media-worker/.env.example` para `media-worker/.env` e preencha os secrets apenas no servidor. O frontend nunca recebe `SUPABASE_SERVICE_ROLE_KEY` nem `OPENROUTER_API_KEY`.

As proteções operacionais são configuráveis: concorrência, lease, intervalo de polling, timeout de inatividade, tamanho dos segmentos, tentativas, espaço mínimo e diretório temporário.

## Docker Compose / VPS

```bash
docker compose up -d --build
curl http://localhost:8080/health
```

O diretório temporário é efêmero e sempre removido em `finally`. O estado durável fica no Supabase, incluindo segmentos já transcritos; outro container retoma jobs com lease expirado.

## Railway

1. Crie um serviço separado chamado `kooki-media-worker` apontando para este repositório.
2. Defina `RAILWAY_DOCKERFILE_PATH=media-worker/Dockerfile`; o contexto de build permanece na raiz do repositório.
3. Cadastre as variáveis de `media-worker/.env.example` no painel.
4. Configure `/health` como healthcheck e mantenha um único replica inicialmente.

Não altere o serviço Cobalt. `COBALT_API_URL` continua apontando para `https://kooki.up.railway.app/`.

## Coolify

Crie um recurso Dockerfile com contexto `media-worker`, cadastre as mesmas variáveis genéricas e configure o healthcheck HTTP `/health`. Nenhum volume persistente é necessário.

## Deploy manual

```bash
docker build -f media-worker/Dockerfile -t kooki-media-worker .
docker run -d --restart unless-stopped --env-file media-worker/.env -p 8080:8080 kooki-media-worker
```

## Fluxo

1. A Edge Function autentica, valida, cria o job e responde HTTP 202.
2. O worker faz claim atômico via `FOR UPDATE SKIP LOCKED` e renova o lease.
3. Uploads são lidos do bucket privado por URL assinada curta. Links pedem áudio ao Cobalt e caem para vídeo 720p.
4. A resposta é consumida imediatamente como stream pelo ffmpeg, normalizada para MP3 mono/16 kHz/64 kbps e dividida em segmentos.
5. Cada segmento é transcrito separadamente, persistido e retomável.
6. A receita é estruturada, validada e salva; o frontend acompanha por Realtime com polling de segurança.
