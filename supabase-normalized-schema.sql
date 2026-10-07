-- HAKU ADMIN MANAGER - STRUKTUR DATABASE NORMALIZED
-- Jalankan file ini di Supabase SQL Editor.
-- Catatan: schema ini menyiapkan tabel lengkap untuk multi-device.
-- Aplikasi frontend saat ini masih memakai tabel app_state sampai kodenya dimigrasikan ke tabel-tabel ini.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'DrinkStock',
  address text,
  phone text,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  role text not null default 'admin' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, user_id)
);

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  brand_name text not null default 'DrinkStock',
  business_address text,
  business_phone text,
  report_header text,
  report_footer text,
  low_stock_threshold integer not null default 5,
  currency text not null default 'IDR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text,
  volume integer,
  stock integer not null default 0 check (stock >= 0),
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  price numeric(14, 2) not null default 0 check (price >= 0),
  image_url text,
  image_data text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_code text not null,
  customer_name text,
  delivery_address text,
  status text not null default 'packing' check (status in ('packing', 'delivery', 'refund', 'done')),
  delivery_cost numeric(14, 2) not null default 0 check (delivery_cost >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  subtotal numeric(14, 2) not null default 0 check (subtotal >= 0),
  total numeric(14, 2) not null default 0 check (total >= 0),
  payment_proof_url text,
  payment_proof_name text,
  refund_applied boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, order_code)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  qty integer not null check (qty > 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  line_discount numeric(14, 2) not null default 0 check (line_discount >= 0),
  line_delivery_cost numeric(14, 2) not null default 0 check (line_delivery_cost >= 0),
  line_total numeric(14, 2) not null default 0 check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('in', 'out', 'adjustment')),
  qty integer not null check (qty > 0),
  date timestamptz not null default now(),
  note text,
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  discount numeric(14, 2) not null default 0 check (discount >= 0),
  delivery_cost numeric(14, 2) not null default 0 check (delivery_cost >= 0),
  customer_name text,
  delivery_address text,
  payment_proof_url text,
  payment_proof_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.capital_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  month date not null,
  item_name text not null,
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  qty integer not null default 1 check (qty > 0),
  amount numeric(14, 2) generated always as (unit_price * qty) stored,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null default current_date,
  category text not null,
  description text,
  amount numeric(14, 2) not null check (amount >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  transaction_id uuid references public.stock_transactions(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_members_business_id on public.business_members(business_id);
create index if not exists idx_business_members_user_id on public.business_members(user_id);
create index if not exists idx_products_business_id on public.products(business_id);
create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists idx_orders_business_id on public.orders(business_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_stock_transactions_business_id on public.stock_transactions(business_id);
create index if not exists idx_stock_transactions_product_id on public.stock_transactions(product_id);
create index if not exists idx_stock_transactions_date on public.stock_transactions(date);
create index if not exists idx_capital_entries_business_month on public.capital_entries(business_id, month);
create index if not exists idx_expenses_business_date on public.expenses(business_id, date);
create index if not exists idx_audit_logs_business_id on public.audit_logs(business_id);

drop trigger if exists set_updated_at_businesses on public.businesses;
create trigger set_updated_at_businesses
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_business_members on public.business_members;
create trigger set_updated_at_business_members
before update on public.business_members
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_business_settings on public.business_settings;
create trigger set_updated_at_business_settings
before update on public.business_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_orders on public.orders;
create trigger set_updated_at_orders
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_order_items on public.order_items;
create trigger set_updated_at_order_items
before update on public.order_items
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_stock_transactions on public.stock_transactions;
create trigger set_updated_at_stock_transactions
before update on public.stock_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_capital_entries on public.capital_entries;
create trigger set_updated_at_capital_entries
before update on public.capital_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_expenses on public.expenses;
create trigger set_updated_at_expenses
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_payment_proofs on public.payment_proofs;
create trigger set_updated_at_payment_proofs
before update on public.payment_proofs
for each row execute function public.set_updated_at();

-- VIEW RINGKASAN PENJUALAN
-- total_sold menghitung berapa unit yang sudah terjual.
-- Transaksi dari order refund tidak dihitung sebagai penjualan aktif.

create or replace view public.product_sales_summary
with (security_invoker = true)
as
select
  p.business_id,
  p.id as product_id,
  p.name as product_name,
  p.category,
  p.stock as current_stock,
  coalesce(s.total_sold, 0)::bigint as total_sold,
  coalesce(s.total_revenue, 0)::numeric(14, 2) as total_revenue,
  coalesce(s.total_cost, 0)::numeric(14, 2) as total_cost,
  coalesce(s.total_profit, 0)::numeric(14, 2) as total_profit,
  s.last_sold_at
from public.products p
left join (
  select
    st.business_id,
    st.product_id,
    sum(st.qty)::bigint as total_sold,
    sum(greatest(0, (st.unit_price * st.qty) - st.discount)) as total_revenue,
    sum(st.unit_cost * st.qty) as total_cost,
    sum(greatest(0, (st.unit_price * st.qty) - st.discount) - (st.unit_cost * st.qty) - st.delivery_cost) as total_profit,
    max(st.date) as last_sold_at
  from public.stock_transactions st
  left join public.orders o
    on o.id = st.order_id
    and o.deleted_at is null
  where st.deleted_at is null
    and st.type = 'out'
    and (o.id is null or o.status <> 'refund')
  group by st.business_id, st.product_id
) s
  on s.business_id = p.business_id
  and s.product_id = p.id
where p.deleted_at is null;

create or replace view public.monthly_product_sales_summary
with (security_invoker = true)
as
select
  st.business_id,
  st.product_id,
  coalesce(p.name, 'Produk dihapus') as product_name,
  date_trunc('month', st.date)::date as month,
  sum(st.qty)::bigint as total_sold,
  sum(greatest(0, (st.unit_price * st.qty) - st.discount))::numeric(14, 2) as total_revenue,
  sum(st.unit_cost * st.qty)::numeric(14, 2) as total_cost,
  sum(greatest(0, (st.unit_price * st.qty) - st.discount) - (st.unit_cost * st.qty) - st.delivery_cost)::numeric(14, 2) as total_profit
from public.stock_transactions st
left join public.products p
  on p.id = st.product_id
left join public.orders o
  on o.id = st.order_id
  and o.deleted_at is null
where st.deleted_at is null
  and st.type = 'out'
  and (o.id is null or o.status <> 'refund')
group by
  st.business_id,
  st.product_id,
  coalesce(p.name, 'Produk dihapus'),
  date_trunc('month', st.date)::date;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_members enable row level security;
alter table public.business_settings enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.capital_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.audit_logs enable row level security;

-- POLICY SEMENTARA TANPA LOGIN
-- Aman untuk percobaan awal, tetapi jangan dipakai untuk aplikasi publik serius.
-- Setelah Supabase Auth dibuat, ganti policy ini dengan policy berdasarkan business_members.

drop policy if exists "public_read_businesses" on public.businesses;
drop policy if exists "public_write_businesses" on public.businesses;
create policy "public_read_businesses" on public.businesses for select to anon using (deleted_at is null);
create policy "public_write_businesses" on public.businesses for all to anon using (true) with check (true);

drop policy if exists "public_read_profiles" on public.profiles;
drop policy if exists "public_write_profiles" on public.profiles;
create policy "public_read_profiles" on public.profiles for select to anon using (deleted_at is null);
create policy "public_write_profiles" on public.profiles for all to anon using (true) with check (true);

drop policy if exists "public_read_business_members" on public.business_members;
drop policy if exists "public_write_business_members" on public.business_members;
create policy "public_read_business_members" on public.business_members for select to anon using (deleted_at is null);
create policy "public_write_business_members" on public.business_members for all to anon using (true) with check (true);

drop policy if exists "public_read_business_settings" on public.business_settings;
drop policy if exists "public_write_business_settings" on public.business_settings;
create policy "public_read_business_settings" on public.business_settings for select to anon using (deleted_at is null);
create policy "public_write_business_settings" on public.business_settings for all to anon using (true) with check (true);

drop policy if exists "public_read_products" on public.products;
drop policy if exists "public_write_products" on public.products;
create policy "public_read_products" on public.products for select to anon using (deleted_at is null);
create policy "public_write_products" on public.products for all to anon using (true) with check (true);

drop policy if exists "public_read_orders" on public.orders;
drop policy if exists "public_write_orders" on public.orders;
create policy "public_read_orders" on public.orders for select to anon using (deleted_at is null);
create policy "public_write_orders" on public.orders for all to anon using (true) with check (true);

drop policy if exists "public_read_order_items" on public.order_items;
drop policy if exists "public_write_order_items" on public.order_items;
create policy "public_read_order_items" on public.order_items for select to anon using (deleted_at is null);
create policy "public_write_order_items" on public.order_items for all to anon using (true) with check (true);

drop policy if exists "public_read_stock_transactions" on public.stock_transactions;
drop policy if exists "public_write_stock_transactions" on public.stock_transactions;
create policy "public_read_stock_transactions" on public.stock_transactions for select to anon using (deleted_at is null);
create policy "public_write_stock_transactions" on public.stock_transactions for all to anon using (true) with check (true);

drop policy if exists "public_read_capital_entries" on public.capital_entries;
drop policy if exists "public_write_capital_entries" on public.capital_entries;
create policy "public_read_capital_entries" on public.capital_entries for select to anon using (deleted_at is null);
create policy "public_write_capital_entries" on public.capital_entries for all to anon using (true) with check (true);

drop policy if exists "public_read_expenses" on public.expenses;
drop policy if exists "public_write_expenses" on public.expenses;
create policy "public_read_expenses" on public.expenses for select to anon using (deleted_at is null);
create policy "public_write_expenses" on public.expenses for all to anon using (true) with check (true);

drop policy if exists "public_read_payment_proofs" on public.payment_proofs;
drop policy if exists "public_write_payment_proofs" on public.payment_proofs;
create policy "public_read_payment_proofs" on public.payment_proofs for select to anon using (deleted_at is null);
create policy "public_write_payment_proofs" on public.payment_proofs for all to anon using (true) with check (true);

drop policy if exists "public_read_audit_logs" on public.audit_logs;
drop policy if exists "public_write_audit_logs" on public.audit_logs;
create policy "public_read_audit_logs" on public.audit_logs for select to anon using (true);
create policy "public_write_audit_logs" on public.audit_logs for all to anon using (true) with check (true);

-- DATA AWAL USAHA
insert into public.businesses (id, name)
values ('00000000-0000-0000-0000-000000000001', 'DrinkStock')
on conflict (id) do nothing;

insert into public.business_settings (business_id, brand_name, low_stock_threshold)
values ('00000000-0000-0000-0000-000000000001', 'DrinkStock', 5)
on conflict (business_id) do nothing;
