-- Mirrors recurring_expenses. Unlike category_id/payment_method_id (shared
-- lookups that use `restrict`), investment_id uses `cascade`: an investment
-- is the aggregate root that owns its recurring templates, transactions and
-- valuations as detail records, not a shared reference.
create table public.recurring_investment_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  investment_id uuid not null references public.investments (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recurring_investment_end_after_start check (
    end_date is null or end_date >= start_date
  )
);

create index recurring_investment_contributions_user_id_idx
  on public.recurring_investment_contributions (user_id);
create index recurring_investment_contributions_investment_id_idx
  on public.recurring_investment_contributions (investment_id);

alter table public.recurring_investment_contributions enable row level security;
alter table public.recurring_investment_contributions force row level security;

create policy "recurring_investment_contributions_select_own" on public.recurring_investment_contributions
  for select using (user_id = (select auth.uid()));
create policy "recurring_investment_contributions_insert_own" on public.recurring_investment_contributions
  for insert with check (user_id = (select auth.uid()));
create policy "recurring_investment_contributions_update_own" on public.recurring_investment_contributions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recurring_investment_contributions_delete_own" on public.recurring_investment_contributions
  for delete using (user_id = (select auth.uid()));
