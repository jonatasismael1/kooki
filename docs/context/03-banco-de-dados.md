# Banco — Kooki

Tabelas públicas: `profiles`, `recipe_import_jobs`, `recipes`, `recipe_ingredients`, `recipe_steps`, `categories`, `recipe_categories`, `shopping_lists`, `shopping_list_items`, `shopping_list_item_sources`, `usage_events`. Todas possuem RLS. `private.url_cache` não é exposto ao cliente. Migration: `supabase/migrations/20260711010000_initial_kooki.sql`.
