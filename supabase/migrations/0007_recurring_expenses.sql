create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  payment_method_id uuid not null references public.payment_methods (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  day_of_month int not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date >= start_date)
);

create index recurring_expenses_user_id_idx on public.recurring_expenses (user_id);

alter table public.recurring_expenses enable row level security;
alter table public.recurring_expenses force row level security;

create policy "recurring_expenses_select_own" on public.recurring_expenses
  for select using (user_id = auth.uid());
create policy "recurring_expenses_insert_own" on public.recurring_expenses
  for insert with check (user_id = auth.uid());
create policy "recurring_expenses_update_own" on public.recurring_expenses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recurring_expenses_delete_own" on public.recurring_expenses
  for delete using (user_id = auth.uid());

-- Link generated expenses back to the recurrence that produced them.
alter table public.expenses
  add column recurring_expense_id uuid references public.recurring_expenses (id) on delete set null,
  add column generated_for_month date;

-- Idempotency guard: at most one generated expense per (recurrence, month),
-- even under concurrent generation requests (paired with `on conflict do nothing`).
create unique index expenses_recurring_month_uidx
  on public.expenses (recurring_expense_id, generated_for_month)
  where recurring_expense_id is not null;
