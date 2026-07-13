# Banco — Kooki

Tabelas públicas: `profiles`, `recipe_import_jobs`, `recipes`, `recipe_ingredients`, `recipe_steps`, `recipe_versions`, `categories`, `recipe_categories`, `shopping_lists`, `shopping_list_items`, `shopping_list_item_sources`, `usage_events`. Todas possuem RLS. `private.url_cache` não é exposto ao cliente.

`recipe_versions` guarda snapshots `jsonb` da receita antes de cada alteração. A função transacional `public.save_recipe_revision`, executada como `security invoker`, captura a versão anterior no servidor e atualiza receita, ingredientes e etapas sob as policies do usuário autenticado. A primeira edição de uma receita vinculada a `import_job_id` preserva a versão `original_ai`.

Migrations principais: `supabase/migrations/20260711010000_initial_kooki.sql` e `supabase/migrations/20260713110441_recipe_version_history.sql`.
