-- Shared logo settings for Workspace, HAKU and Studio Desk.
-- Existing application rows and policies remain intact.
begin;

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
grant usage on schema public to anon;
grant select, insert, update on public.app_state to anon;

drop policy if exists "workspace_branding_select" on public.app_state;
drop policy if exists "workspace_branding_insert" on public.app_state;
drop policy if exists "workspace_branding_update" on public.app_state;

create policy "workspace_branding_select"
on public.app_state for select to anon
using (id = 'workspace_main');
create policy "workspace_branding_insert"
on public.app_state for insert to anon
with check (id = 'workspace_main');
create policy "workspace_branding_update"
on public.app_state for update to anon
using (id = 'workspace_main')
with check (id = 'workspace_main');

insert into public.app_state (id, data)
values (
  'workspace_main',
  '{
    "logos": {
      "workspace": {"mode": "initial", "initial": "H", "image": ""},
      "haku": {"mode": "initial", "initial": "H", "image": ""},
      "studio": {"mode": "initial", "initial": "S", "image": ""}
    },
    "appearance": {"background": "default", "shape": "rounded"}
  }'::jsonb
)
on conflict (id) do nothing;

commit;
select id, updated_at from public.app_state where id = 'workspace_main';
