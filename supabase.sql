create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "anon read app state" on public.app_state;
drop policy if exists "anon write app state" on public.app_state;

create policy "anon read app state"
on public.app_state
for select
to anon
using (true);

create policy "anon write app state"
on public.app_state
for all
to anon
using (true)
with check (true);
