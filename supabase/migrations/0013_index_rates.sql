-- Index rates (CDI/Selic/IPCA) are not fetched from any external source in
-- this app; the user maintains them manually, same mental model as
-- payment_methods. Per-user (not global) for architectural consistency with
-- the rest of the schema. prefixado is intentionally excluded here - its
-- rate lives directly on investments.rate_percent.
create table public.index_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  indexador text not null check (indexador in ('cdi', 'ipca', 'selic')),
  annual_rate_percent numeric(7, 4) not null check (annual_rate_percent >= 0),
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (user_id, indexador, effective_from)
);

create index index_rates_user_indexador_date_idx
  on public.index_rates (user_id, indexador, effective_from desc);

alter table public.index_rates enable row level security;
alter table public.index_rates force row level security;

create policy "index_rates_select_own" on public.index_rates
  for select using (user_id = (select auth.uid()));
create policy "index_rates_insert_own" on public.index_rates
  for insert with check (user_id = (select auth.uid()));
create policy "index_rates_update_own" on public.index_rates
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "index_rates_delete_own" on public.index_rates
  for delete using (user_id = (select auth.uid()));
