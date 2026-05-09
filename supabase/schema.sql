create table if not exists public.employees (
  id text primary key,
  name text not null,
  role_note text not null default '',
  color text,
  hourly_wage integer not null default 0,
  start_date date not null,
  end_date date,
  weekly_holiday_pay_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists role_note text not null default '';
alter table public.employees add column if not exists color text;
alter table public.employees add column if not exists hourly_wage integer not null default 0;
alter table public.employees add column if not exists start_date date not null default current_date;
alter table public.employees add column if not exists end_date date;
alter table public.employees add column if not exists weekly_holiday_pay_enabled boolean not null default true;
alter table public.employees add column if not exists status text not null default 'active';
alter table public.employees add column if not exists created_at timestamptz not null default now();

create table if not exists public.shifts (
  id text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  weekday text not null check (weekday in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  start_time text not null,
  end_time text not null,
  break_minutes integer not null default 0,
  repeats_weekly boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

alter table public.shifts add column if not exists employee_id text;
alter table public.shifts add column if not exists weekday text;
alter table public.shifts add column if not exists start_time text;
alter table public.shifts add column if not exists end_time text;
alter table public.shifts add column if not exists break_minutes integer not null default 0;
alter table public.shifts add column if not exists repeats_weekly boolean not null default true;
alter table public.shifts add column if not exists note text;
alter table public.shifts add column if not exists created_at timestamptz not null default now();

create table if not exists public.settings (
  id text primary key,
  store_name text not null,
  base_week_label text not null,
  default_hourly_wage integer not null default 10030,
  monthly_week_multiplier numeric not null default 4.345,
  weekly_holiday_calculation text not null,
  created_at timestamptz not null default now()
);

alter table public.settings add column if not exists store_name text;
alter table public.settings add column if not exists base_week_label text;
alter table public.settings add column if not exists default_hourly_wage integer not null default 10030;
alter table public.settings add column if not exists monthly_week_multiplier numeric not null default 4.345;
alter table public.settings add column if not exists weekly_holiday_calculation text;
alter table public.settings add column if not exists created_at timestamptz not null default now();

alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.settings enable row level security;

drop policy if exists "public read employees" on public.employees;
drop policy if exists "public write employees" on public.employees;
drop policy if exists "public read shifts" on public.shifts;
drop policy if exists "public write shifts" on public.shifts;
drop policy if exists "public read settings" on public.settings;
drop policy if exists "public write settings" on public.settings;

create policy "public read employees" on public.employees for select using (true);
create policy "public write employees" on public.employees for all using (true) with check (true);

create policy "public read shifts" on public.shifts for select using (true);
create policy "public write shifts" on public.shifts for all using (true) with check (true);

create policy "public read settings" on public.settings for select using (true);
create policy "public write settings" on public.settings for all using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.employees;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shifts;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
