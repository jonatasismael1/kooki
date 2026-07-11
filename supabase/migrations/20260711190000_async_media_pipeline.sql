alter table public.recipe_import_jobs
  add column if not exists progress smallint not null default 0 check (progress between 0 and 100),
  add column if not exists attempts integer not null default 0,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists lease_until timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists media_metadata jsonb not null default '{}'::jsonb,
  add column if not exists transcript text,
  add column if not exists cancel_requested_at timestamptz;

create index if not exists recipe_import_jobs_claim_idx
  on public.recipe_import_jobs (status, lease_until, created_at)
  where status in ('pending', 'extracting', 'transcribing', 'structuring', 'saving');

create table if not exists public.recipe_import_segments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.recipe_import_jobs(id) on delete cascade,
  segment_index integer not null check (segment_index >= 0),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  start_seconds numeric not null check (start_seconds >= 0),
  end_seconds numeric not null check (end_seconds >= start_seconds),
  attempts integer not null default 0,
  transcript text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, segment_index)
);

alter table public.recipe_import_segments enable row level security;
create policy segments_own_select on public.recipe_import_segments
  for select to authenticated
  using (exists (
    select 1 from public.recipe_import_jobs j
    where j.id = job_id and j.user_id = (select auth.uid())
  ));

create or replace function public.claim_recipe_import_job(
  worker_id text,
  lease_seconds integer default 300
) returns setof public.recipe_import_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare claimed_id uuid;
begin
  select j.id into claimed_id
  from public.recipe_import_jobs j
  where j.cancel_requested_at is null
    and (
      j.status = 'pending'
      or (
        j.status in ('extracting','transcribing','structuring','saving')
        and (j.lease_until is null or j.lease_until < now())
      )
    )
  order by j.created_at
  for update skip locked
  limit 1;

  if claimed_id is null then return; end if;

  return query
  update public.recipe_import_jobs j
  set status = 'extracting', current_stage = 'Analisando o conteúdo',
      locked_at = now(), locked_by = worker_id,
      lease_until = now() + make_interval(secs => greatest(30, lease_seconds)),
      heartbeat_at = now(), started_at = coalesce(j.started_at, now()),
      attempts = j.attempts + 1, attempt_count = j.attempt_count + 1,
      updated_at = now()
  where j.id = claimed_id
  returning j.*;
end;
$$;

revoke all on function public.claim_recipe_import_job(text, integer) from public, anon, authenticated;
grant execute on function public.claim_recipe_import_job(text, integer) to service_role;
grant all on public.recipe_import_segments to service_role;

alter publication supabase_realtime add table public.recipe_import_segments;

update storage.buckets
set file_size_limit = null,
    allowed_mime_types = null
where id = 'recipe-audio';
