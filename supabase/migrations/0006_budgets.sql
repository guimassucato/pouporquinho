create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null,
  amount_limit numeric(12, 2) not null check (amount_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month),
  constraint month_is_first_of_month check (date_trunc('month', month) = month)
);

create index budgets_user_month_idx on public.budgets (user_id, month);

alter table public.budgets enable row level security;
alter table public.budgets force row level security;

create policy "budgets_select_own" on public.budgets
  for select using (user_id = auth.uid());
create policy "budgets_insert_own" on public.budgets
  for insert with check (user_id = auth.uid());
create policy "budgets_update_own" on public.budgets
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_delete_own" on public.budgets
  for delete using (user_id = auth.uid());
