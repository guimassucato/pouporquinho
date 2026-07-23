create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  payment_method_id uuid not null references public.payment_methods (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_user_date_idx on public.expenses (user_id, expense_date desc);
create index expenses_user_category_idx on public.expenses (user_id, category_id);
create index expenses_user_payment_method_idx on public.expenses (user_id, payment_method_id);

alter table public.expenses enable row level security;
alter table public.expenses force row level security;

create policy "expenses_select_own" on public.expenses
  for select using (user_id = auth.uid());
create policy "expenses_insert_own" on public.expenses
  for insert with check (user_id = auth.uid());
create policy "expenses_update_own" on public.expenses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "expenses_delete_own" on public.expenses
  for delete using (user_id = auth.uid());

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();
