-- Evolve existing organization without removing user data.
alter table public.categories alter column user_id drop not null;
alter table public.categories add column if not exists type text not null default 'custom' check(type in('meal','dish','diet','method','custom'));
alter table public.categories add column if not exists is_system boolean not null default false;
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists position integer not null default 0;
alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.recipes add column if not exists is_favorite boolean not null default false;
alter table public.recipes add column if not exists source_image_url text;

create unique index if not exists categories_system_name_idx on public.categories(lower(name)) where is_system;
create index if not exists categories_user_position_idx on public.categories(user_id,position);

insert into public.categories(user_id,name,type,is_system,icon,position)
values
 (null,'Café da manhã','meal',true,'coffee',10),(null,'Almoço','meal',true,'sun',20),
 (null,'Jantar','meal',true,'moon',30),(null,'Lanches','meal',true,'sandwich',40),
 (null,'Sobremesas','dish',true,'cake-slice',50),(null,'Bebidas','dish',true,'cup-soda',60),
 (null,'Acompanhamentos','dish',true,'utensils',70),(null,'Saladas','dish',true,'salad',80),
 (null,'Sopas','dish',true,'soup',90),(null,'Massas','dish',true,'wheat',100),
 (null,'Molhos e temperos','dish',true,'glass-water',110)
on conflict do nothing;

create table public.tags(
 id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id) on delete cascade,
 name text not null,is_system boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index tags_user_name_idx on public.tags(user_id,lower(name)) where user_id is not null;
create unique index tags_system_name_idx on public.tags(lower(name)) where is_system;
insert into public.tags(user_id,name,is_system) values
 (null,'Rápida',true),(null,'Fácil',true),(null,'Econômica',true),(null,'Saudável',true),(null,'Até 30 minutos',true),
 (null,'Air fryer',true),(null,'Forno',true),(null,'Uma panela',true),(null,'Para crianças',true),(null,'Congelável',true),
 (null,'Vegetariana',true),(null,'Vegana',true),(null,'Sem lactose',true),(null,'Sem glúten',true) on conflict do nothing;
create table public.recipe_tags(recipe_id uuid references public.recipes(id) on delete cascade,tag_id uuid references public.tags(id) on delete cascade,created_at timestamptz not null default now(),primary key(recipe_id,tag_id));

create table public.collections(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 name text not null,description text,icon text,cover_url text,status text not null default 'active' check(status in('active','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,name)
);
create table public.collection_recipes(collection_id uuid references public.collections(id) on delete cascade,recipe_id uuid references public.recipes(id) on delete cascade,position integer not null default 0,created_at timestamptz not null default now(),primary key(collection_id,recipe_id));
create table public.recipe_notes(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,recipe_id uuid not null references public.recipes(id) on delete cascade,content text not null check(length(content) between 1 and 5000),created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create table public.meal_plans(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,week_start date not null,name text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,week_start));
create table public.meal_plan_items(
 id uuid primary key default gen_random_uuid(),meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,recipe_id uuid references public.recipes(id) on delete set null,
 day_of_week smallint not null check(day_of_week between 0 and 6),meal_type text not null check(meal_type in('breakfast','lunch','snack','dinner','other')),
 manual_name text,servings numeric check(servings is null or servings>0),notes text,position integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(recipe_id is not null or manual_name is not null)
);

create table public.recipe_cook_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,recipe_id uuid not null references public.recipes(id) on delete cascade,
 cooked_at timestamptz not null default now(),rating smallint check(rating between 1 and 5),comment text,actual_time_minutes integer check(actual_time_minutes is null or actual_time_minutes>=0),
 servings numeric check(servings is null or servings>0),changes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.recipe_cook_session_photos(id uuid primary key default gen_random_uuid(),session_id uuid not null references public.recipe_cook_sessions(id) on delete cascade,user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,storage_path text not null,alt_text text,created_at timestamptz not null default now());

create table public.pantry_items(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,name text not null,normalized_name text not null,
 quantity numeric check(quantity is null or quantity>=0),unit text,expires_at date,sector text not null default 'Outros',notes text,status text not null default 'available' check(status in('available','low','out','expired')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index pantry_user_sector_idx on public.pantry_items(user_id,sector,status);

create table public.recipe_share_links(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,recipe_id uuid not null references public.recipes(id) on delete cascade,
 token text not null default encode(extensions.gen_random_bytes(24),'hex') unique,is_public boolean not null default false,revoked_at timestamptz,expires_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index share_active_token_idx on public.recipe_share_links(token) where revoked_at is null;
create table public.recipe_photos(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,recipe_id uuid not null references public.recipes(id) on delete cascade,storage_path text not null,alt_text text,position integer not null default 0,is_cover boolean not null default false,created_at timestamptz not null default now());
alter table public.recipes add column if not exists cover_photo_id uuid references public.recipe_photos(id) on delete set null;

create index recipe_notes_recipe_idx on public.recipe_notes(recipe_id,created_at desc);
create index meal_items_plan_day_idx on public.meal_plan_items(meal_plan_id,day_of_week,position);
create index cook_sessions_recipe_idx on public.recipe_cook_sessions(recipe_id,cooked_at desc);
create index recipe_photos_recipe_idx on public.recipe_photos(recipe_id,position);

alter table public.tags enable row level security;alter table public.recipe_tags enable row level security;alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;alter table public.recipe_notes enable row level security;alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;alter table public.recipe_cook_sessions enable row level security;alter table public.recipe_cook_session_photos enable row level security;
alter table public.pantry_items enable row level security;alter table public.recipe_share_links enable row level security;alter table public.recipe_photos enable row level security;

drop policy if exists categories_own on public.categories;
create policy categories_read on public.categories for select to authenticated using(is_system or user_id=(select auth.uid()));
create policy categories_insert_custom on public.categories for insert to authenticated with check(not is_system and user_id=(select auth.uid()));
create policy categories_update_custom on public.categories for update to authenticated using(not is_system and user_id=(select auth.uid())) with check(not is_system and user_id=(select auth.uid()));
create policy categories_delete_custom on public.categories for delete to authenticated using(not is_system and user_id=(select auth.uid()));
create policy tags_read on public.tags for select to authenticated using(is_system or user_id=(select auth.uid()));
create policy tags_custom_write on public.tags for all to authenticated using(not is_system and user_id=(select auth.uid())) with check(not is_system and user_id=(select auth.uid()));
create policy recipe_tags_own on public.recipe_tags for all to authenticated using(exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=(select auth.uid()))) with check(exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=(select auth.uid())));
create policy collections_own on public.collections for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy collection_recipes_own on public.collection_recipes for all to authenticated using(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid()))) with check(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=(select auth.uid())));
create policy notes_own on public.recipe_notes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=(select auth.uid())));
create policy meal_plans_own on public.meal_plans for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy meal_items_own on public.meal_plan_items for all to authenticated using(exists(select 1 from public.meal_plans p where p.id=meal_plan_id and p.user_id=(select auth.uid()))) with check(exists(select 1 from public.meal_plans p where p.id=meal_plan_id and p.user_id=(select auth.uid())));
create policy cook_sessions_own on public.recipe_cook_sessions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=(select auth.uid())));
create policy cook_photos_own on public.recipe_cook_session_photos for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy pantry_own on public.pantry_items for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy share_links_own on public.recipe_share_links for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=(select auth.uid())));
create policy recipe_photos_own on public.recipe_photos for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.recipes r where r.id=recipe_id and r.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('recipe-photos','recipe-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy recipe_photos_storage_select on storage.objects for select to authenticated using(bucket_id='recipe-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy recipe_photos_storage_insert on storage.objects for insert to authenticated with check(bucket_id='recipe-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy recipe_photos_storage_delete on storage.objects for delete to authenticated using(bucket_id='recipe-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
