create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('original_ai', 'manual')),
  label text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index recipe_versions_recipe_created_idx
  on public.recipe_versions (recipe_id, created_at desc);

create index recipe_versions_user_idx
  on public.recipe_versions (user_id);

create unique index recipe_versions_original_ai_idx
  on public.recipe_versions (recipe_id)
  where kind = 'original_ai';

alter table public.recipe_versions enable row level security;

revoke all on table public.recipe_versions from anon;
grant select, insert on table public.recipe_versions to authenticated;

create policy recipe_versions_own_select
  on public.recipe_versions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy recipe_versions_own_insert
  on public.recipe_versions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.recipes
      where recipes.id = recipe_id
        and recipes.user_id = (select auth.uid())
    )
  );

create or replace function public.save_recipe_revision(
  p_recipe_id uuid,
  p_snapshot jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe public.recipes%rowtype;
  v_previous_snapshot jsonb;
  v_version_kind text;
begin
  if jsonb_typeof(p_snapshot) <> 'object'
    or nullif(btrim(p_snapshot ->> 'title'), '') is null
    or jsonb_typeof(p_snapshot -> 'ingredients') <> 'array'
    or jsonb_typeof(p_snapshot -> 'steps') <> 'array'
    or (
      p_snapshot -> 'servings' <> 'null'::jsonb
      and (p_snapshot ->> 'servings')::numeric <= 0
    )
  then
    raise exception 'INVALID_RECIPE_SNAPSHOT' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_snapshot -> 'ingredients') as ingredient
    where nullif(btrim(ingredient ->> 'name'), '') is null
  ) or exists (
    select 1
    from jsonb_array_elements(p_snapshot -> 'steps') as step
    where nullif(btrim(step ->> 'instruction'), '') is null
  ) then
    raise exception 'INVALID_RECIPE_ITEMS' using errcode = '22023';
  end if;

  select *
  into v_recipe
  from public.recipes
  where id = p_recipe_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'RECIPE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'title', v_recipe.title,
    'description', v_recipe.description,
    'servings', v_recipe.servings,
    'status', v_recipe.status,
    'ingredients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ingredient.id,
          'name', ingredient.name,
          'normalized_name', ingredient.normalized_name,
          'quantity_text', ingredient.quantity_text,
          'quantity', ingredient.quantity,
          'unit', ingredient.unit,
          'normalized_unit', ingredient.normalized_unit,
          'notes', ingredient.notes,
          'sector', ingredient.sector,
          'position', ingredient.position
        ) order by ingredient.position
      )
      from public.recipe_ingredients as ingredient
      where ingredient.recipe_id = p_recipe_id
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', step.id,
          'instruction', step.instruction,
          'position', step.position
        ) order by step.position
      )
      from public.recipe_steps as step
      where step.recipe_id = p_recipe_id
    ), '[]'::jsonb)
  ) into v_previous_snapshot;

  v_version_kind := case
    when v_recipe.import_job_id is not null
      and not exists (
        select 1
        from public.recipe_versions
        where recipe_id = p_recipe_id
          and kind = 'original_ai'
      )
    then 'original_ai'
    else 'manual'
  end;

  insert into public.recipe_versions (
    recipe_id,
    user_id,
    kind,
    label,
    snapshot
  ) values (
    p_recipe_id,
    (select auth.uid()),
    v_version_kind,
    case
      when v_version_kind = 'original_ai' then 'Receita original gerada pela IA'
      else 'Versão anterior à alteração manual'
    end,
    v_previous_snapshot
  );

  update public.recipes
  set title = btrim(p_snapshot ->> 'title'),
      description = nullif(btrim(p_snapshot ->> 'description'), ''),
      servings = case
        when p_snapshot -> 'servings' is null
          or p_snapshot -> 'servings' = 'null'::jsonb then null
        else (p_snapshot ->> 'servings')::numeric
      end,
      status = 'ready',
      updated_at = now()
  where id = p_recipe_id;

  delete from public.recipe_ingredients
  where recipe_id = p_recipe_id
    and id not in (
      select (ingredient ->> 'id')::uuid
      from jsonb_array_elements(p_snapshot -> 'ingredients') as ingredient
    );

  insert into public.recipe_ingredients (
    id,
    recipe_id,
    name,
    normalized_name,
    quantity_text,
    quantity,
    unit,
    normalized_unit,
    notes,
    sector,
    position
  )
  select
    (ingredient ->> 'id')::uuid,
    p_recipe_id,
    btrim(ingredient ->> 'name'),
    nullif(btrim(ingredient ->> 'normalized_name'), ''),
    nullif(btrim(ingredient ->> 'quantity_text'), ''),
    case
      when ingredient -> 'quantity' is null
        or ingredient -> 'quantity' = 'null'::jsonb then null
      else (ingredient ->> 'quantity')::numeric
    end,
    nullif(btrim(ingredient ->> 'unit'), ''),
    nullif(btrim(ingredient ->> 'normalized_unit'), ''),
    nullif(btrim(ingredient ->> 'notes'), ''),
    coalesce(nullif(btrim(ingredient ->> 'sector'), ''), 'Outros'),
    (ingredient ->> 'position')::integer
  from jsonb_array_elements(p_snapshot -> 'ingredients') as ingredient
  on conflict (id) do update
  set name = excluded.name,
      normalized_name = excluded.normalized_name,
      quantity_text = excluded.quantity_text,
      quantity = excluded.quantity,
      unit = excluded.unit,
      normalized_unit = excluded.normalized_unit,
      notes = excluded.notes,
      sector = excluded.sector,
      position = excluded.position
  where public.recipe_ingredients.recipe_id = p_recipe_id;

  delete from public.recipe_steps
  where recipe_id = p_recipe_id
    and id not in (
      select (step ->> 'id')::uuid
      from jsonb_array_elements(p_snapshot -> 'steps') as step
    );

  insert into public.recipe_steps (
    id,
    recipe_id,
    instruction,
    position
  )
  select
    (step ->> 'id')::uuid,
    p_recipe_id,
    btrim(step ->> 'instruction'),
    (step ->> 'position')::integer
  from jsonb_array_elements(p_snapshot -> 'steps') as step
  on conflict (id) do update
  set instruction = excluded.instruction,
      position = excluded.position
  where public.recipe_steps.recipe_id = p_recipe_id;
end;
$$;

revoke all on function public.save_recipe_revision(uuid, jsonb) from public;
revoke all on function public.save_recipe_revision(uuid, jsonb) from anon;
grant execute on function public.save_recipe_revision(uuid, jsonb) to authenticated;
