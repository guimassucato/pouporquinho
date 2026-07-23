create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cash', 'debit', 'credit', 'pix', 'other')),
  color text not null,
  icon text not null,
  closing_day int check (closing_day between 1 and 31),
  due_day int check (due_day between 1 and 31),
  credit_limit numeric(12, 2),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint credit_fields_required check (
    kind <> 'credit' or (closing_day is not null and due_day is not null)
  )
);

create index payment_methods_user_id_idx on public.payment_methods (user_id);

alter table public.payment_methods enable row level security;
alter table public.payment_methods force row level security;

create policy "payment_methods_select_own" on public.payment_methods
  for select using (user_id = auth.uid());
create policy "payment_methods_insert_own" on public.payment_methods
  for insert with check (user_id = auth.uid());
create policy "payment_methods_update_own" on public.payment_methods
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "payment_methods_delete_own" on public.payment_methods
  for delete using (user_id = auth.uid());
