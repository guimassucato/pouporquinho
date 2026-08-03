create table public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date >= start_date)
);

create index recurring_incomes_user_id_idx on public.recurring_incomes (user_id);
create index recurring_incomes_category_id_idx on public.recurring_incomes (category_id);

alter table public.recurring_incomes enable row level security;
alter table public.recurring_incomes force row level security;

create policy "recurring_incomes_select_own" on public.recurring_incomes
  for select using (user_id = (select auth.uid()));
create policy "recurring_incomes_insert_own" on public.recurring_incomes
  for insert with check (user_id = (select auth.uid()));
create policy "recurring_incomes_update_own" on public.recurring_incomes
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recurring_incomes_delete_own" on public.recurring_incomes
  for delete using (user_id = (select auth.uid()));

-- Link generated incomes back to the recurrence that produced them.
alter table public.incomes
  add column recurring_income_id uuid references public.recurring_incomes (id) on delete set null,
  add column generated_for_month date;

-- Idempotency guard: at most one generated income per (recurrence, month).
-- A plain unique constraint (not a partial index) so `on conflict` can
-- target it directly - see 0010_fix_recurring_conflict_target.sql.
alter table public.incomes
  add constraint incomes_recurring_month_key
  unique (recurring_income_id, generated_for_month);
