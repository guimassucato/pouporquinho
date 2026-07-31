-- The ledger of cash moving in/out of an investment: aporte/resgate are
-- cash events, rendimento_reinvestido/rendimento_sacado record yield that
-- either stays in the position or is paid out. amount is always a positive
-- magnitude; direction is derived from `type` in application code.
create table public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  investment_id uuid not null references public.investments (id) on delete cascade,
  type text not null check (
    type in ('aporte', 'resgate', 'rendimento_reinvestido', 'rendimento_sacado')
  ),
  amount numeric(12, 2) not null check (amount > 0),
  transaction_date date not null,
  notes text,
  recurring_investment_contribution_id uuid
    references public.recurring_investment_contributions (id) on delete set null,
  generated_for_month date,
  created_at timestamptz not null default now(),
  -- Plain (non-partial) unique constraint: PostgREST's
  -- upsert(onConflict:"a,b") issues `ON CONFLICT (a,b)` with no WHERE, so it
  -- cannot target a partial index (see 0010_fix_recurring_conflict_target.sql
  -- for the same issue on expenses). NULLs are distinct in Postgres, so
  -- manually-entered transactions (recurring_investment_contribution_id is
  -- null) never collide with each other.
  constraint investment_transactions_recurring_month_key
    unique (recurring_investment_contribution_id, generated_for_month)
);

create index investment_transactions_investment_date_idx
  on public.investment_transactions (investment_id, transaction_date desc);
create index investment_transactions_user_id_idx
  on public.investment_transactions (user_id);

alter table public.investment_transactions enable row level security;
alter table public.investment_transactions force row level security;

create policy "investment_transactions_select_own" on public.investment_transactions
  for select using (user_id = (select auth.uid()));
create policy "investment_transactions_insert_own" on public.investment_transactions
  for insert with check (user_id = (select auth.uid()));
create policy "investment_transactions_update_own" on public.investment_transactions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "investment_transactions_delete_own" on public.investment_transactions
  for delete using (user_id = (select auth.uid()));
