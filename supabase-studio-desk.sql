-- Studio Desk uses public.app_state, row freelance_main.
-- This script preserves existing app data and HAKU policies.
begin;

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
grant usage on schema public to anon;
grant select, insert, update on public.app_state to anon;

-- The current app has no login and uses the anon role.
drop policy if exists "studio_desk_select" on public.app_state;
drop policy if exists "studio_desk_insert" on public.app_state;
drop policy if exists "studio_desk_update" on public.app_state;

create policy "studio_desk_select"
on public.app_state for select to anon
using (id = 'freelance_main');

create policy "studio_desk_insert"
on public.app_state for insert to anon
with check (id = 'freelance_main');

create policy "studio_desk_update"
on public.app_state for update to anon
using (id = 'freelance_main')
with check (id = 'freelance_main');

insert into public.app_state (id, data)
values (
  'freelance_main',
  '{
    "clients": [],
    "payments": [],
    "teamPayments": [],
    "todos": [],
    "invoices": [],
    "settings": {
      "projectCategories": ["Desain", "Website", "UI/UX", "Prototype", "Joki tugas"],
      "categories": ["Desain", "Website", "UI/UX", "Prototype", "Joki tugas"],
      "methods": ["Transfer bank (TF)", "QRIS", "Tunai (Cash)", "E-Wallet"],
      "statuses": ["Berjalan", "Menunggu", "Selesai", "Dibatalkan"]
    }
  }'::jsonb
)
on conflict (id) do nothing;

commit;

-- Confirm the Studio Desk row exists.
select id, updated_at from public.app_state where id = 'freelance_main';
