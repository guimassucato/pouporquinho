create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  income_date date not null,
  created_at timestamptz not null default now()
);

create index incomes_user_date_idx on public.incomes (user_id, income_date desc);

alter table public.incomes enable row level security;
alter table public.incomes force row level security;

create policy "incomes_select_own" on public.incomes
  for select using (user_id = auth.uid());
create policy "incomes_insert_own" on public.incomes
  for insert with check (user_id = auth.uid());
create policy "incomes_update_own" on public.incomes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "incomes_delete_own" on public.incomes
  for delete using (user_id = auth.uid());
