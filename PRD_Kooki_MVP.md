# PRD — Kooki MVP

## Livro de Receitas Inteligente

**Versão:** 1.0  
**Status:** Pronto para implementação  
**Plataforma:** SaaS web mobile-first / PWA  
**Stack principal:** React, Vite, Tailwind CSS, Shadcn/ui, Supabase e OpenRouter

---

# 1. Visão do produto

O **Kooki** é um SaaS mobile-first que transforma conteúdos culinários dispersos em redes sociais, vídeos, blogs e textos em receitas organizadas e fáceis de usar.

O usuário poderá:

- importar uma receita por link;
- colar um texto manualmente;
- enviar ou gravar um áudio;
- revisar a receita estruturada;
- salvar receitas em seu acervo;
- utilizar um Modo Cozinha com leitura facilitada;
- selecionar várias receitas e gerar uma lista de compras consolidada;
- marcar itens durante as compras;
- organizar receitas por categorias.

O principal benefício do produto é reduzir o trabalho de salvar, interpretar, organizar e reutilizar receitas encontradas na internet.

---

# 2. Problema

Receitas encontradas em redes sociais e blogs normalmente ficam espalhadas entre:

- posts salvos;
- vídeos;
- capturas de tela;
- links enviados por mensagem;
- anotações;
- legendas incompletas;
- listas de ingredientes sem modo de preparo estruturado.

Além disso, o usuário precisa voltar ao conteúdo original, assistir novamente ao vídeo, pausar com as mãos ocupadas e montar manualmente sua lista de compras.

O Kooki centraliza esse processo em uma única experiência.

---

# 3. Objetivos do MVP

O MVP deve permitir que o usuário:

1. crie uma conta;
2. importe uma receita por link de blog ou YouTube;
3. crie uma receita colando texto;
4. crie uma receita por áudio;
5. revise receitas com baixa confiança;
6. salve e edite receitas;
7. visualize receitas no Modo Cozinha;
8. organize receitas em categorias;
9. selecione receitas e gere uma lista de compras;
10. marque itens da lista de compras;
11. acompanhe o limite de uso do plano gratuito.

---

# 4. Fora do escopo inicial

Os seguintes itens não fazem parte do núcleo obrigatório do MVP:

- captura automática garantida de Instagram;
- captura automática garantida de TikTok;
- compartilhamento público de receitas;
- recursos sociais;
- comentários;
- avaliações;
- planejamento nutricional;
- cálculo de calorias;
- substituições automáticas de ingredientes;
- conversão universal entre peso, volume e unidades;
- sincronização com supermercados;
- reconhecimento de imagens;
- geração de receitas do zero;
- plano familiar;
- controle de estoque da despensa;
- aplicativo nativo para iOS e Android.

Instagram e TikTok poderão aparecer no MVP como fontes experimentais, sempre com fallback manual obrigatório.

---

# 5. Público principal

## 5.1 Usuário principal

Pessoa que:

- encontra receitas em redes sociais;
- cozinha usando o celular;
- salva muitos conteúdos, mas raramente os encontra depois;
- precisa organizar compras;
- deseja reduzir o tempo gasto transcrevendo ingredientes e etapas.

## 5.2 Necessidades principais

- guardar receitas em um único lugar;
- transformar vídeo ou texto em receita organizada;
- acessar instruções sem precisar assistir ao conteúdo novamente;
- cozinhar com melhor legibilidade;
- gerar uma lista de compras sem copiar ingredientes manualmente.

---

# 6. Proposta de valor

> Cole um link, texto ou áudio. O Kooki organiza a receita, salva no seu acervo e transforma os ingredientes em uma lista de compras.

---

# 7. Métricas iniciais

O produto deverá registrar as seguintes métricas:

- número de contas criadas;
- número de importações iniciadas;
- número de importações concluídas;
- taxa de falha por plataforma;
- percentual de receitas revisadas;
- tempo médio de processamento;
- número de receitas salvas por usuário;
- número de listas de compras criadas;
- percentual de usuários que usam o Modo Cozinha;
- conversão do plano gratuito para pago;
- custo médio de IA por receita processada.

---

# 8. Escopo funcional

## 8.1 Autenticação

O MVP deverá oferecer:

- login com Google;
- login por Magic Link;
- logout;
- recuperação de sessão;
- exclusão de conta;
- tela de aceite de termos e política de privacidade.

O login com Apple poderá ser implementado após o MVP.

## 8.2 Perfil

Cada usuário terá:

- nome;
- e-mail;
- avatar opcional;
- plano atual;
- data de renovação do plano;
- preferência de tema;
- data de criação.

## 8.3 Plano gratuito

O plano gratuito terá limite de:

- **15 importações concluídas por período mensal**.

Regras:

- apenas importações concluídas com sucesso consomem o limite;
- falhas não consomem o limite;
- excluir uma receita não devolve o uso;
- importar novamente o mesmo link conta como novo uso, exceto quando o sistema detectar uma repetição imediata causada por erro;
- receitas criadas totalmente de forma manual não consomem importação;
- o período reinicia mensalmente com base na data de criação ou renovação da assinatura.

---

# 9. Fontes aceitas

## 9.1 Blogs

Suporte obrigatório no MVP.

Ordem de extração:

1. JSON-LD do tipo `Recipe`;
2. dados estruturados da página;
3. conteúdo limpo da página;
4. modelo de IA para organização;
5. fallback manual.

## 9.2 YouTube

Suporte obrigatório no MVP.

Ordem de extração:

1. descrição do vídeo;
2. legenda disponível;
3. transcrição do áudio;
4. fallback manual.

## 9.3 Instagram

Suporte experimental.

Possíveis resultados:

- conteúdo extraído;
- conteúdo parcialmente extraído;
- necessidade de colar a legenda;
- necessidade de enviar áudio;
- link privado ou indisponível.

O sistema nunca deverá prometer captura automática garantida.

## 9.4 TikTok

Suporte experimental, com as mesmas regras do Instagram.

## 9.5 Texto manual

O usuário poderá:

- colar uma legenda;
- colar uma receita;
- colar ingredientes e modo de preparo;
- escrever livremente.

## 9.6 Áudio

O usuário poderá:

- gravar áudio;
- enviar arquivo compatível;
- revisar a transcrição antes da estruturação, quando necessário.

---

# 10. Stack tecnológica

## 10.1 Frontend

- React;
- Vite;
- TypeScript;
- Tailwind CSS;
- Shadcn/ui;
- Lucide React;
- React Router;
- TanStack Query;
- React Hook Form;
- Zod;
- PWA;
- Supabase JS.

## 10.2 Backend

- Supabase PostgreSQL;
- Supabase Auth;
- Supabase Edge Functions;
- Supabase Storage;
- Supabase Realtime;
- Supabase Queues ou tabela de jobs com worker;
- Row Level Security.

## 10.3 Inteligência artificial

- OpenRouter;
- modelo econômico da categoria mini ou flash para estruturação;
- Whisper Large V3 Turbo para transcrição;
- saída estruturada;
- validação obrigatória no servidor.

## 10.4 Observabilidade

- logs estruturados;
- captura de erros;
- registro de custo por chamada;
- registro de latência;
- identificação do modelo utilizado;
- identificação da etapa onde ocorreu a falha.

---

# 11. Arquitetura

## 11.1 Visão geral

```text
Frontend React
    |
    | Supabase Auth
    | Supabase Client
    v
Supabase
    |
    |-- PostgreSQL
    |-- Row Level Security
    |-- Storage
    |-- Realtime
    |-- Edge Functions
    |
    v
Serviços externos
    |
    |-- OpenRouter
    |-- Serviço de leitura de páginas
    |-- Serviço de extração de legendas
    |-- Serviço de captura ou transcrição de áudio
```

## 11.2 Regra principal

Nenhuma chave privada poderá ser enviada ao frontend.

Devem permanecer exclusivamente no backend:

- OpenRouter API Key;
- Supabase Service Role;
- chaves de serviços de scraping;
- chaves de transcrição;
- credenciais de provedores externos.

---

# 12. Pipeline de importação

## 12.1 Etapas

1. usuário envia link, texto ou áudio;
2. frontend valida o formato básico;
3. backend valida o conteúdo;
4. sistema cria um `import_job`;
5. sistema verifica o limite do plano;
6. sistema identifica a origem;
7. sistema normaliza a URL;
8. sistema consulta o cache;
9. sistema extrai o conteúdo bruto;
10. sistema transcreve áudio, quando necessário;
11. sistema estrutura o conteúdo com IA;
12. backend valida o JSON;
13. backend calcula a confiança;
14. sistema salva a receita em transação;
15. sistema registra o uso;
16. frontend recebe o resultado;
17. receita é aberta em visualização ou revisão.

## 12.2 Estados do job

```text
pending
validating
checking_limit
checking_cache
extracting
transcribing
structuring
validating_output
saving
needs_manual_input
needs_review
completed
failed
cancelled
```

## 12.3 Progresso exibido ao usuário

O frontend deverá mostrar etapas reais, sem porcentagem falsa:

- analisando o conteúdo;
- buscando as informações;
- organizando os ingredientes;
- montando o preparo;
- finalizando a receita.

## 12.4 Tempo de processamento

Metas:

- cache válido: até 2 segundos;
- texto simples: até 5 segundos;
- blog estruturado: até 8 segundos;
- vídeo com legenda: até 15 segundos;
- áudio ou vídeo com transcrição: variável.

Quando o processamento ultrapassar o tempo de resposta direto, o sistema deverá continuar por job assíncrono.

---

# 13. Validação de links

O backend deverá:

- aceitar apenas `http` e `https`;
- rejeitar `localhost`;
- rejeitar IPs privados;
- rejeitar destinos internos;
- limitar redirecionamentos;
- validar cada redirecionamento;
- aplicar timeout;
- limitar tamanho da resposta;
- bloquear protocolos não permitidos;
- aplicar rate limit;
- impedir acesso a metadados internos de nuvem;
- normalizar a URL antes de gerar hash.

Parâmetros de rastreamento deverão ser removidos quando possível:

```text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
fbclid
gclid
```

---

# 14. Cache

## 14.1 Regra

O cache deverá ser consultado antes de qualquer chamada de IA.

## 14.2 Chave

A chave deverá considerar:

```text
normalized_url
parser_version
schema_version
```

## 14.3 Segurança

A tabela de cache não poderá ser lida diretamente pelo cliente.

Acesso permitido apenas para:

- Edge Functions;
- processos internos;
- Service Role.

## 14.4 Validade

O cache deverá possuir:

- data de criação;
- data de expiração;
- versão do parser;
- versão do schema;
- modelo usado;
- hash do conteúdo;
- status de validação;
- data do último uso.

---

# 15. Extração de conteúdo

## 15.1 Blogs

O sistema deverá procurar primeiro dados estruturados.

Prioridade:

1. JSON-LD `Recipe`;
2. metadados;
3. HTML principal;
4. serviço de limpeza;
5. IA.

## 15.2 Vídeos

O sistema deverá tentar:

1. descrição;
2. legenda;
3. transcrição;
4. fallback manual.

## 15.3 Conteúdo insuficiente

Quando não houver informações suficientes, o sistema deverá mudar para:

```text
needs_manual_input
```

A interface deverá permitir:

- colar legenda;
- escrever conteúdo;
- gravar áudio;
- enviar áudio;
- cancelar importação.

---

# 16. Estruturação com IA

## 16.1 Regras

O modelo deverá:

- retornar apenas JSON;
- não inventar ingredientes;
- não completar quantidades sem evidência;
- usar `null` quando a informação não estiver disponível;
- preservar observações relevantes;
- separar ingredientes por seção;
- classificar o setor de cada ingrediente;
- gerar alertas para campos incompletos;
- informar confiança;
- nunca inserir instruções médicas ou nutricionais não presentes na fonte.

## 16.2 JSON Schema

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": [
    "title",
    "description",
    "prep_time_minutes",
    "cook_time_minutes",
    "total_time_minutes",
    "servings",
    "ingredients",
    "steps",
    "suggested_category",
    "source_platform",
    "source_url",
    "parsing_confidence",
    "warnings"
  ],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "description": {
      "type": ["string", "null"]
    },
    "prep_time_minutes": {
      "type": ["number", "null"],
      "minimum": 0
    },
    "cook_time_minutes": {
      "type": ["number", "null"],
      "minimum": 0
    },
    "total_time_minutes": {
      "type": ["number", "null"],
      "minimum": 0
    },
    "servings": {
      "type": ["number", "null"],
      "minimum": 0
    },
    "ingredients": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "normalized_name",
          "quantity_text",
          "quantity",
          "unit",
          "normalized_unit",
          "notes",
          "sector",
          "section"
        ],
        "properties": {
          "name": {
            "type": "string",
            "minLength": 1
          },
          "normalized_name": {
            "type": ["string", "null"]
          },
          "quantity_text": {
            "type": ["string", "null"]
          },
          "quantity": {
            "type": ["number", "null"],
            "minimum": 0
          },
          "unit": {
            "type": ["string", "null"]
          },
          "normalized_unit": {
            "type": ["string", "null"]
          },
          "notes": {
            "type": ["string", "null"]
          },
          "sector": {
            "type": "string",
            "enum": [
              "Hortifrúti",
              "Açougue",
              "Laticínios",
              "Mercearia",
              "Padaria",
              "Bebidas",
              "Congelados",
              "Temperos",
              "Outros"
            ]
          },
          "section": {
            "type": ["string", "null"]
          }
        }
      }
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "order",
          "instruction",
          "section"
        ],
        "properties": {
          "order": {
            "type": "integer",
            "minimum": 1
          },
          "instruction": {
            "type": "string",
            "minLength": 1
          },
          "section": {
            "type": ["string", "null"]
          }
        }
      }
    },
    "suggested_category": {
      "type": ["string", "null"]
    },
    "source_platform": {
      "type": "string",
      "enum": [
        "youtube",
        "tiktok",
        "instagram",
        "blog",
        "manual",
        "audio"
      ]
    },
    "source_url": {
      "type": ["string", "null"]
    },
    "parsing_confidence": {
      "type": "string",
      "enum": [
        "high",
        "medium",
        "low"
      ]
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  }
}
```

## 16.3 Validação no servidor

Após receber o retorno:

1. validar com Zod ou Ajv;
2. rejeitar propriedades desconhecidas;
3. tentar uma correção automática apenas uma vez;
4. registrar o retorno inválido;
5. não inserir dados inválidos no banco;
6. abrir revisão quando necessário.

---

# 17. Confiança da receita

A confiança não poderá depender apenas da resposta do modelo.

O servidor deverá reduzir a confiança quando:

- não houver ingredientes;
- não houver etapas;
- o texto extraído for curto;
- muitas quantidades estiverem ausentes;
- houver transcrição incompleta;
- o título for genérico;
- existirem avisos críticos;
- o conteúdo parecer uma conversa, e não uma receita;
- ingredientes e etapas forem incoerentes.

## 17.1 Comportamento

### Confiança alta

Abrir a receita pronta para visualização.

### Confiança média

Abrir a receita com alerta discreto e opção de revisar.

### Confiança baixa

Abrir automaticamente no editor estruturado.

Mensagem sugerida:

> Algumas informações não ficaram claras na fonte. Revise os campos destacados antes de salvar.

---

# 18. Banco de dados

## 18.1 Schema proposto

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free'
    check (plan in ('free', 'pro')),
  plan_renewed_at timestamptz,
  theme_preference text default 'system'
    check (theme_preference in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_type text not null
    check (input_type in ('url', 'text', 'audio')),
  source_url text,
  normalized_url text,
  source_platform text
    check (
      source_platform is null
      or source_platform in (
        'youtube',
        'tiktok',
        'instagram',
        'blog',
        'manual',
        'audio'
      )
    ),
  raw_text text,
  audio_path text,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'validating',
        'checking_limit',
        'checking_cache',
        'extracting',
        'transcribing',
        'structuring',
        'validating_output',
        'saving',
        'needs_manual_input',
        'needs_review',
        'completed',
        'failed',
        'cancelled'
      )
    ),
  current_stage text,
  progress smallint
    check (progress is null or progress between 0 and 100),
  provider text,
  model_id text,
  parser_version text,
  schema_version text,
  attempt_count integer not null default 0,
  fallback_reason text,
  error_code text,
  error_message text,
  recipe_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  import_job_id uuid references public.recipe_import_jobs(id) on delete set null,
  title text not null,
  description text,
  prep_time_minutes integer
    check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes integer
    check (cook_time_minutes is null or cook_time_minutes >= 0),
  total_time_minutes integer
    check (total_time_minutes is null or total_time_minutes >= 0),
  servings numeric
    check (servings is null or servings >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'needs_review', 'ready', 'archived')),
  source_url text,
  source_url_normalized text,
  source_platform text
    check (
      source_platform is null
      or source_platform in (
        'youtube',
        'tiktok',
        'instagram',
        'blog',
        'manual',
        'audio'
      )
    ),
  parsing_confidence text
    check (
      parsing_confidence is null
      or parsing_confidence in ('high', 'medium', 'low')
    ),
  warnings jsonb not null default '[]'::jsonb,
  parser_version text,
  schema_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipe_import_jobs
  add constraint recipe_import_jobs_recipe_id_fkey
  foreign key (recipe_id)
  references public.recipes(id)
  on delete set null;

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  normalized_name text,
  quantity_text text,
  quantity numeric
    check (quantity is null or quantity >= 0),
  unit text,
  normalized_unit text,
  notes text,
  sector text not null default 'Outros'
    check (
      sector in (
        'Hortifrúti',
        'Açougue',
        'Laticínios',
        'Mercearia',
        'Padaria',
        'Bebidas',
        'Congelados',
        'Temperos',
        'Outros'
      )
    ),
  section text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order integer not null check (step_order >= 1),
  instruction text not null,
  section text,
  created_at timestamptz not null default now(),
  unique (recipe_id, step_order)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

create table public.recipe_categories (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (recipe_id, category_id)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null
    references public.shopping_lists(id)
    on delete cascade,
  name text not null,
  normalized_name text,
  quantity_text text,
  quantity numeric
    check (quantity is null or quantity >= 0),
  unit text,
  normalized_unit text,
  sector text not null default 'Outros'
    check (
      sector in (
        'Hortifrúti',
        'Açougue',
        'Laticínios',
        'Mercearia',
        'Padaria',
        'Bebidas',
        'Congelados',
        'Temperos',
        'Outros'
      )
    ),
  notes text,
  is_checked boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_list_item_sources (
  shopping_list_item_id uuid not null
    references public.shopping_list_items(id)
    on delete cascade,
  recipe_id uuid not null
    references public.recipes(id)
    on delete cascade,
  recipe_ingredient_id uuid
    references public.recipe_ingredients(id)
    on delete set null,
  quantity numeric,
  unit text,
  primary key (
    shopping_list_item_id,
    recipe_id,
    recipe_ingredient_id
  )
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null
    check (
      event_type in (
        'recipe_import_completed',
        'recipe_import_refunded'
      )
    ),
  import_job_id uuid references public.recipe_import_jobs(id) on delete set null,
  units integer not null default 1 check (units > 0),
  period_key text not null,
  created_at timestamptz not null default now()
);

create table public.url_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_url text not null,
  url_hash text not null,
  content_hash text,
  source_platform text not null,
  parsed_json jsonb not null,
  parser_version text not null,
  schema_version text not null,
  model_id text,
  validation_status text not null default 'valid'
    check (validation_status in ('valid', 'invalid', 'expired')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (url_hash, parser_version, schema_version)
);
```

## 18.2 Índices

```sql
create index recipes_user_created_idx
  on public.recipes(user_id, created_at desc);

create index recipes_user_status_idx
  on public.recipes(user_id, status);

create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients(recipe_id, sort_order);

create index recipe_steps_recipe_idx
  on public.recipe_steps(recipe_id, step_order);

create index import_jobs_user_created_idx
  on public.recipe_import_jobs(user_id, created_at desc);

create index import_jobs_status_idx
  on public.recipe_import_jobs(status);

create index shopping_lists_user_created_idx
  on public.shopping_lists(user_id, created_at desc);

create index shopping_list_items_list_idx
  on public.shopping_list_items(shopping_list_id, sector, sort_order);

create index usage_events_user_period_idx
  on public.usage_events(user_id, period_key);

create index url_cache_hash_idx
  on public.url_cache(url_hash);
```

---

# 19. Row Level Security

## 19.1 Regra geral

O usuário poderá acessar apenas dados vinculados ao próprio `auth.uid()`.

A tabela `url_cache` não deverá possuir políticas de leitura para usuários comuns.

## 19.2 Ativação

```sql
alter table public.profiles enable row level security;
alter table public.recipe_import_jobs enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.categories enable row level security;
alter table public.recipe_categories enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.shopping_list_item_sources enable row level security;
alter table public.usage_events enable row level security;
alter table public.url_cache enable row level security;
```

## 19.3 Policies de exemplo

```sql
create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "recipes_all_own"
on public.recipes
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "import_jobs_all_own"
on public.recipe_import_jobs
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "categories_all_own"
on public.categories
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "shopping_lists_all_own"
on public.shopping_lists
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "usage_events_select_own"
on public.usage_events
for select
using (user_id = auth.uid());

create policy "recipe_ingredients_all_own"
on public.recipe_ingredients
for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = auth.uid()
  )
);

create policy "recipe_steps_all_own"
on public.recipe_steps
for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_steps.recipe_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_steps.recipe_id
      and r.user_id = auth.uid()
  )
);

create policy "recipe_categories_all_own"
on public.recipe_categories
for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_categories.recipe_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.categories c
    where c.id = recipe_categories.category_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_categories.recipe_id
      and r.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.categories c
    where c.id = recipe_categories.category_id
      and c.user_id = auth.uid()
  )
);

create policy "shopping_list_items_all_own"
on public.shopping_list_items
for all
using (
  exists (
    select 1
    from public.shopping_lists sl
    where sl.id = shopping_list_items.shopping_list_id
      and sl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shopping_lists sl
    where sl.id = shopping_list_items.shopping_list_id
      and sl.user_id = auth.uid()
  )
);

create policy "shopping_item_sources_all_own"
on public.shopping_list_item_sources
for all
using (
  exists (
    select 1
    from public.shopping_list_items sli
    join public.shopping_lists sl
      on sl.id = sli.shopping_list_id
    where sli.id = shopping_list_item_sources.shopping_list_item_id
      and sl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shopping_list_items sli
    join public.shopping_lists sl
      on sl.id = sli.shopping_list_id
    where sli.id = shopping_list_item_sources.shopping_list_item_id
      and sl.user_id = auth.uid()
  )
);
```

Não criar policy pública para `url_cache`.

---

# 20. Criação automática do perfil

Criar trigger para inserir um perfil após cadastro no Supabase Auth.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

---

# 21. Tela inicial

## 21.1 Objetivos

A tela inicial deverá permitir:

- iniciar uma importação;
- visualizar receitas recentes;
- acessar o acervo;
- acompanhar o limite do plano;
- acessar listas de compras.

## 21.2 Componentes

- saudação;
- campo central para colar link;
- botão de importar;
- opções “colar texto” e “usar áudio”;
- indicador de uso;
- receitas recentes;
- atalhos para acervo e compras;
- estado vazio.

## 21.3 Indicador do plano gratuito

Exemplo:

```text
8 de 15 importações usadas neste mês
```

Não utilizar linguagem de ameaça.

Quando faltar pouco:

> Restam 3 importações neste período.

---

# 22. Acervo de receitas

## 22.1 Recursos

- lista de receitas;
- busca por título;
- filtro por categoria;
- filtro por status;
- ordenação;
- card com imagem futura opcional;
- data de criação;
- plataforma de origem;
- tempo total;
- status de revisão.

## 22.2 Ações

- abrir;
- editar;
- duplicar;
- arquivar;
- excluir;
- adicionar à lista de compras;
- entrar no Modo Cozinha.

---

# 23. Editor de receita

## 23.1 Campos

- título;
- descrição;
- tempo de preparo;
- tempo de cozimento;
- tempo total;
- porções;
- categoria;
- ingredientes;
- etapas;
- origem;
- avisos.

## 23.2 Ingredientes

Cada item deverá permitir:

- nome;
- quantidade;
- unidade;
- observação;
- setor;
- seção;
- ordenação;
- exclusão;
- adição.

## 23.3 Etapas

Cada etapa deverá permitir:

- ordem;
- instrução;
- seção;
- reordenação;
- exclusão;
- adição.

---

# 24. Modo Cozinha

## 24.1 Objetivo

Permitir leitura e interação a aproximadamente um metro de distância, com as mãos ocupadas.

## 24.2 Requisitos

- fonte principal mínima de 18px;
- preferência por 20px em etapas;
- alto contraste;
- botões mínimos de 48px por 48px;
- ingredientes com checkboxes;
- etapas isoladas em cards;
- numeração visível;
- progresso de etapas;
- botão grande para avançar;
- botão grande para voltar;
- opção de aumentar a fonte;
- suporte a tema claro e escuro;
- respeito a `prefers-reduced-motion`;
- foco visível;
- labels acessíveis;
- estados não dependentes apenas de cor;
- suporte às safe areas;
- Wake Lock;
- fallback quando Wake Lock não estiver disponível.

## 24.3 Wake Lock

O sistema deverá:

1. solicitar Wake Lock ao entrar no modo;
2. renovar quando a aba voltar a ficar visível;
3. liberar quando sair do modo;
4. tratar falhas;
5. informar o usuário quando a tela não puder ser mantida ativa.

## 24.4 Estado da sessão

Checkboxes e etapa atual não deverão alterar a receita original.

No MVP, podem ser armazenados em:

- estado local;
- `localStorage`.

---

# 25. Lista de compras

## 25.1 Criação

O usuário poderá:

1. selecionar várias receitas;
2. definir quantidade de porções;
3. gerar uma lista;
4. revisar os itens;
5. salvar.

## 25.2 Agrupamento

Os itens serão agrupados por:

- Hortifrúti;
- Açougue;
- Laticínios;
- Mercearia;
- Padaria;
- Bebidas;
- Congelados;
- Temperos;
- Outros.

## 25.3 Consolidação

O sistema poderá somar itens apenas quando:

- `normalized_name` for igual;
- unidades forem iguais;
- unidades forem comprovadamente compatíveis;
- quantidades forem numéricas.

Exemplo permitido:

```text
2 ovos + 3 ovos = 5 ovos
```

Exemplo que não deverá ser convertido automaticamente:

```text
1 xícara de farinha + 200 g de farinha
```

Resultado:

```text
Farinha
- 1 xícara
- 200 g
```

## 25.4 Duplicidades incertas

Quando houver dúvida:

> Encontramos itens parecidos com medidas diferentes. Revise antes de concluir a lista.

## 25.5 Checklist

O usuário poderá:

- marcar item;
- desmarcar item;
- editar;
- excluir;
- adicionar item;
- alterar setor;
- concluir lista.

O estado deverá ser persistente.

---

# 26. Fluxo de fallback manual

Quando o conteúdo não puder ser capturado:

## 26.1 Mensagem

> Não conseguimos acessar esse conteúdo automaticamente. Cole a legenda, escreva a receita ou envie um áudio para continuar.

## 26.2 Ações

- colar legenda;
- escrever receita;
- gravar áudio;
- enviar áudio;
- tentar novamente;
- cancelar.

## 26.3 Regra

O fallback deverá continuar no mesmo job.

Não criar importações duplicadas sem necessidade.

---

# 27. Tratamento de erros

## 27.1 Link inválido

> Esse link não parece válido. Confira o endereço e tente novamente.

## 27.2 Conteúdo privado

> O conteúdo parece privado ou indisponível. Cole a legenda ou envie um áudio para continuar.

## 27.3 Falha de rede

> A conexão foi interrompida. Sua importação foi preservada e pode ser retomada.

## 27.4 Limite atingido

> Você usou as 15 importações disponíveis neste período.

Apresentar:

- data de renovação;
- opção de assinar;
- opção de criar receita manualmente.

## 27.5 Resposta incompleta

> Algumas informações ficaram incompletas. Revise os campos destacados.

## 27.6 Falha geral

> Não foi possível concluir essa importação. Tente novamente ou use o modo manual.

---

# 28. Segurança

## 28.1 Requisitos

- RLS em todas as tabelas;
- Service Role apenas no backend;
- API Keys fora do frontend;
- rate limiting;
- validação de URL;
- proteção contra SSRF;
- limite de payload;
- limite de duração de áudio;
- limite de tentativas;
- timeout de provedores;
- logs sem dados sensíveis;
- sanitização de conteúdo;
- validação de JSON;
- controle de CORS;
- proteção contra abuso;
- exclusão de arquivos temporários;
- política de retenção de dados.

## 28.2 Prompt injection

Conteúdo externo deverá ser tratado como dado não confiável.

O prompt deverá:

- delimitar claramente o conteúdo;
- proibir execução de instruções presentes na fonte;
- exigir schema;
- não permitir texto fora do JSON.

---

# 29. Processamento assíncrono

## 29.1 Regra

Importações pesadas não deverão depender de uma única requisição longa.

## 29.2 Estratégia

- criar job;
- processar por worker ou Edge Function;
- atualizar status;
- usar polling ou Realtime;
- permitir retomada;
- registrar tentativas;
- impedir duplicação;
- usar idempotência.

## 29.3 Repetição

Falhas transitórias poderão ter até três tentativas.

Exemplo:

```text
1ª tentativa: imediata
2ª tentativa: após 30 segundos
3ª tentativa: após 2 minutos
```

Falhas permanentes não deverão ser repetidas automaticamente.

---

# 30. Armazenamento de áudio

## 30.1 Regras

- bucket privado;
- acesso por URL assinada;
- limite de tamanho;
- formatos permitidos;
- exclusão automática após transcrição;
- vinculação ao usuário;
- validação do tipo real do arquivo.

## 30.2 Formatos iniciais

- audio/mpeg;
- audio/mp4;
- audio/wav;
- audio/webm;
- audio/ogg.

---

# 31. PWA

O MVP deverá:

- ser instalável;
- possuir manifest;
- possuir ícones;
- abrir em modo standalone;
- ter navegação mobile-first;
- lidar com conexão instável;
- apresentar estado offline básico;
- preservar receitas já carregadas;
- não tentar processar IA offline.

---

# 32. Design

## 32.1 Direção visual

- clean;
- moderna;
- acolhedora;
- funcional;
- culinária sem estética infantil;
- cores quentes e sutis;
- contraste alto;
- predominância de fundo claro;
- tema escuro;
- componentes simples;
- hierarquia visual forte.

## 32.2 Princípios

- uma ação principal por tela;
- textos curtos;
- feedback de estado;
- botões grandes;
- formulários objetivos;
- redução de ruído;
- evitar animações decorativas;
- evitar excesso de cards;
- não esconder ações essenciais.

---

# 33. Navegação

## 33.1 Mobile

Barra inferior com:

- Início;
- Receitas;
- Compras;
- Perfil.

## 33.2 Desktop

Sidebar com os mesmos itens.

---

# 34. Critérios de aceite

## 34.1 Autenticação

- usuário entra com Google;
- usuário entra com Magic Link;
- sessão é restaurada;
- dados de um usuário não são visíveis para outro.

## 34.2 Importação por blog

- link válido é aceito;
- conteúdo estruturado é priorizado;
- receita é criada;
- falha direciona ao fallback.

## 34.3 Importação por YouTube

- descrição ou legenda é capturada quando disponível;
- áudio é transcrito quando necessário;
- falha direciona ao fallback.

## 34.4 Texto manual

- usuário cola texto;
- receita é estruturada;
- saída inválida não é salva;
- baixa confiança abre revisão.

## 34.5 Áudio

- usuário grava ou envia áudio;
- transcrição ocorre no backend;
- arquivo temporário é excluído;
- receita pode ser revisada.

## 34.6 Cache

- mesma URL não gera nova chamada de IA quando o cache for válido;
- cache não é acessível pelo cliente;
- conteúdo é copiado para o acervo do usuário.

## 34.7 Lista de compras

- usuário seleciona receitas;
- itens compatíveis são somados;
- unidades incompatíveis permanecem separadas;
- checklist é persistente.

## 34.8 Modo Cozinha

- tela permanece ativa quando suportado;
- passos são legíveis;
- botões possuem área mínima;
- estado não altera a receita original.

## 34.9 Plano gratuito

- limite mensal é respeitado;
- falha não consome uso;
- exclusão não devolve uso;
- uso é atualizado apenas após conclusão.

---

# 35. Testes obrigatórios

## 35.1 Unitários

- normalização de URL;
- classificação de plataforma;
- validação do JSON;
- cálculo de confiança;
- consolidação de ingredientes;
- cálculo de limite;
- idempotência.

## 35.2 Integração

- Supabase Auth;
- RLS;
- criação de perfil;
- jobs;
- OpenRouter;
- Storage;
- cache;
- geração da lista.

## 35.3 Segurança

- acesso cruzado entre usuários;
- tentativa de leitura do cache;
- SSRF;
- payload malicioso;
- prompt injection;
- upload inválido;
- abuso de endpoints.

## 35.4 Interface

- mobile pequeno;
- tablet;
- desktop;
- tema escuro;
- leitor de tela;
- navegação por teclado;
- redução de movimento;
- conexão lenta.

---

# 36. Fases de desenvolvimento

## Fase 1 — Fundação

- projeto React;
- design system;
- autenticação;
- banco;
- RLS;
- perfil;
- navegação;
- dashboard.

## Fase 2 — Receitas manuais

- texto manual;
- editor;
- acervo;
- categorias;
- Modo Cozinha.

## Fase 3 — Pipeline de IA

- jobs;
- OpenRouter;
- validação;
- confiança;
- cache;
- consumo do plano.

## Fase 4 — Fontes externas

- blogs;
- YouTube;
- áudio;
- fallback manual.

## Fase 5 — Lista de compras

- seleção;
- consolidação;
- setores;
- checklist;
- persistência.

## Fase 6 — Finalização

- PWA;
- acessibilidade;
- observabilidade;
- testes;
- revisão de segurança;
- otimização de custos.

---

# 37. Entregáveis

O projeto deverá entregar:

- aplicação React funcional;
- banco Supabase configurado;
- migrations SQL;
- RLS testado;
- autenticação;
- Edge Functions;
- pipeline de jobs;
- integração com OpenRouter;
- importação de blogs;
- importação de YouTube;
- fallback manual;
- transcrição;
- editor;
- acervo;
- Modo Cozinha;
- lista de compras;
- PWA;
- logs;
- tratamento de erros;
- documentação de instalação;
- arquivo `.env.example`;
- instruções de deploy;
- testes essenciais.

---

# 38. Variáveis de ambiente

Exemplo:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=

PARSER_VERSION=1.0.0
RECIPE_SCHEMA_VERSION=1.0.0

MAX_AUDIO_SIZE_MB=25
MAX_TEXT_LENGTH=50000
FREE_MONTHLY_IMPORT_LIMIT=15
```

Nenhuma variável secreta deverá utilizar o prefixo `VITE_`.

---

# 39. Decisões finais do MVP

1. Instagram e TikTok são experimentais.
2. O fallback manual faz parte do produto.
3. Apple Login não é obrigatório no lançamento.
4. A lista soma apenas unidades compatíveis.
5. O cache não é público.
6. Importações pesadas usam jobs.
7. Toda resposta de IA é validada no backend.
8. O plano gratuito considera importações concluídas.
9. Ingredientes são armazenados por receita no MVP.
10. O sistema deve priorizar confiabilidade, não a aparência de automação perfeita.

---

# 40. Definição de pronto

O MVP estará pronto quando um usuário puder:

1. criar uma conta;
2. importar uma receita por blog, YouTube, texto ou áudio;
3. revisar campos incompletos;
4. salvar a receita;
5. encontrá-la no acervo;
6. cozinhar usando o Modo Cozinha;
7. combinar ingredientes de várias receitas;
8. usar uma lista de compras persistente;
9. utilizar o sistema sem acessar dados de outros usuários;
10. receber respostas claras quando uma fonte não puder ser processada.
