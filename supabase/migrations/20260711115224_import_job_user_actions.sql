drop policy if exists jobs_own_cancel on public.recipe_import_jobs;
create policy jobs_own_cancel
on public.recipe_import_jobs
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and status = 'cancelled');

drop policy if exists jobs_own_delete on public.recipe_import_jobs;
create policy jobs_own_delete
on public.recipe_import_jobs
for delete
to authenticated
using (user_id = (select auth.uid()));
