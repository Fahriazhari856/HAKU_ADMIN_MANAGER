create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_select_public" on public.app_state;
drop policy if exists "app_state_insert_public" on public.app_state;
drop policy if exists "app_state_update_public" on public.app_state;

create policy "app_state_select_public"
on public.app_state
for select
to anon
using (id = 'drinkstock_main');

create policy "app_state_insert_public"
on public.app_state
for insert
to anon
with check (id = 'drinkstock_main');

create policy "app_state_update_public"
on public.app_state
for update
to anon
using (id = 'drinkstock_main')
with check (id = 'drinkstock_main');

insert into public.app_state (id, data)
values (
  'drinkstock_main',
  '{
    "settings": {
      "brandName": "DrinkStock",
      "lowStockThreshold": 5
    },
    "products": [],
    "transactions": [],
    "orders": [],
    "cart": [],
    "capitalEntries": []
  }'::jsonb
)
on conflict (id) do nothing;
