create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  username text primary key,
  role text not null,
  allowed_views jsonb not null default '[]'::jsonb,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.puestos (
  id text primary key,
  sector text not null,
  numero integer not null,
  ocupacion text not null,
  pago text not null,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now(),
  unique (sector, numero)
);

create table if not exists public.payments (
  id text primary key,
  puesto_id text,
  sector text not null,
  numero integer not null,
  amount numeric not null default 0,
  date timestamptz not null,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  category text not null,
  amount numeric not null default 0,
  date timestamptz not null,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cars (
  id text primary key,
  plate text not null,
  entry_user text,
  amount numeric not null default 0,
  date timestamptz not null,
  exited_at timestamptz,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.car_audit (
  id text primary key,
  action text not null,
  entity_id text not null,
  user_name text,
  date timestamptz not null,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  action text not null,
  entity text not null,
  entity_id text not null,
  user_name text,
  date timestamptz not null,
  data jsonb not null,
  sync_batch uuid not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_puestos_sector_numero on public.puestos (sector, numero);
create index if not exists idx_puestos_ocupacion_pago on public.puestos (ocupacion, pago);
create index if not exists idx_payments_date on public.payments (date desc);
create index if not exists idx_payments_puesto on public.payments (puesto_id);
create index if not exists idx_expenses_date on public.expenses (date desc);
create index if not exists idx_cars_date on public.cars (date desc);
create index if not exists idx_cars_plate on public.cars (plate);
create index if not exists idx_cars_entry_user on public.cars (entry_user);
create index if not exists idx_car_audit_date on public.car_audit (date desc);
create index if not exists idx_audit_logs_date on public.audit_logs (date desc);

alter table public.app_state enable row level security;
alter table public.app_users enable row level security;
alter table public.puestos enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.cars enable row level security;
alter table public.car_audit enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "anon read app state" on public.app_state;
drop policy if exists "anon write app state" on public.app_state;
drop policy if exists "anon read app users" on public.app_users;
drop policy if exists "anon write app users" on public.app_users;
drop policy if exists "anon read puestos" on public.puestos;
drop policy if exists "anon write puestos" on public.puestos;
drop policy if exists "anon read payments" on public.payments;
drop policy if exists "anon write payments" on public.payments;
drop policy if exists "anon read expenses" on public.expenses;
drop policy if exists "anon write expenses" on public.expenses;
drop policy if exists "anon read cars" on public.cars;
drop policy if exists "anon write cars" on public.cars;
drop policy if exists "anon read car audit" on public.car_audit;
drop policy if exists "anon write car audit" on public.car_audit;
drop policy if exists "anon read audit logs" on public.audit_logs;
drop policy if exists "anon write audit logs" on public.audit_logs;

create policy "anon read app state" on public.app_state for select to anon using (true);
create policy "anon write app state" on public.app_state for all to anon using (true) with check (true);
create policy "anon read app users" on public.app_users for select to anon using (true);
create policy "anon write app users" on public.app_users for all to anon using (true) with check (true);
create policy "anon read puestos" on public.puestos for select to anon using (true);
create policy "anon write puestos" on public.puestos for all to anon using (true) with check (true);
create policy "anon read payments" on public.payments for select to anon using (true);
create policy "anon write payments" on public.payments for all to anon using (true) with check (true);
create policy "anon read expenses" on public.expenses for select to anon using (true);
create policy "anon write expenses" on public.expenses for all to anon using (true) with check (true);
create policy "anon read cars" on public.cars for select to anon using (true);
create policy "anon write cars" on public.cars for all to anon using (true) with check (true);
create policy "anon read car audit" on public.car_audit for select to anon using (true);
create policy "anon write car audit" on public.car_audit for all to anon using (true) with check (true);
create policy "anon read audit logs" on public.audit_logs for select to anon using (true);
create policy "anon write audit logs" on public.audit_logs for all to anon using (true) with check (true);
