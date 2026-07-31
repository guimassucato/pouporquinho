-- Manual mark-to-market snapshots. Used only for investment types without a
-- deterministic yield formula (renda_variavel/fundo/cripto/previdencia) -
-- enforced in the server action layer, not here, consistent with how the
-- rest of this schema keeps cross-table business rules out of triggers.
create table public.investment_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  investment_id uuid not null references public.investments (id) on delete cascade,
  valuation_date date not null,
  total_value numeric(12, 2) not null check (total_value >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (investment_id, valuation_date)
);

create index investment_valuations_investment_date_idx
  on public.investment_valuations (investment_id, valuation_date desc);
create index investment_valuations_user_id_idx
  on public.investment_valuations (user_id);

alter table public.investment_valuations enable row level security;
alter table public.investment_valuations force row level security;

create policy "investment_valuations_select_own" on public.investment_valuations
  for select using (user_id = (select auth.uid()));
create policy "investment_valuations_insert_own" on public.investment_valuations
  for insert with check (user_id = (select auth.uid()));
create policy "investment_valuations_update_own" on public.investment_valuations
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "investment_valuations_delete_own" on public.investment_valuations
  for delete using (user_id = (select auth.uid()));
