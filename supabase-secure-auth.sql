-- Ejecutar despues de crear usuarios en Supabase Auth y migrar la app al modo Auth.
-- Este script reemplaza las policies anon por policies autenticadas.

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

drop policy if exists "authenticated read app users" on public.app_users;
drop policy if exists "authenticated write app users" on public.app_users;
drop policy if exists "authenticated read puestos" on public.puestos;
drop policy if exists "authenticated write puestos" on public.puestos;
drop policy if exists "authenticated read payments" on public.payments;
drop policy if exists "authenticated write payments" on public.payments;
drop policy if exists "authenticated read expenses" on public.expenses;
drop policy if exists "authenticated write expenses" on public.expenses;
drop policy if exists "authenticated read cars" on public.cars;
drop policy if exists "authenticated write cars" on public.cars;
drop policy if exists "authenticated read car audit" on public.car_audit;
drop policy if exists "authenticated write car audit" on public.car_audit;
drop policy if exists "authenticated read audit logs" on public.audit_logs;
drop policy if exists "authenticated write audit logs" on public.audit_logs;

create policy "authenticated read app users" on public.app_users for select to authenticated using (true);
create policy "authenticated write app users" on public.app_users for all to authenticated using (true) with check (true);
create policy "authenticated read puestos" on public.puestos for select to authenticated using (true);
create policy "authenticated write puestos" on public.puestos for all to authenticated using (true) with check (true);
create policy "authenticated read payments" on public.payments for select to authenticated using (true);
create policy "authenticated write payments" on public.payments for all to authenticated using (true) with check (true);
create policy "authenticated read expenses" on public.expenses for select to authenticated using (true);
create policy "authenticated write expenses" on public.expenses for all to authenticated using (true) with check (true);
create policy "authenticated read cars" on public.cars for select to authenticated using (true);
create policy "authenticated write cars" on public.cars for all to authenticated using (true) with check (true);
create policy "authenticated read car audit" on public.car_audit for select to authenticated using (true);
create policy "authenticated write car audit" on public.car_audit for all to authenticated using (true) with check (true);
create policy "authenticated read audit logs" on public.audit_logs for select to authenticated using (true);
create policy "authenticated write audit logs" on public.audit_logs for all to authenticated using (true) with check (true);
