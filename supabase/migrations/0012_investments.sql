create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (
    type in ('renda_fixa', 'renda_variavel', 'fundo', 'cripto', 'previdencia')
  ),
  -- indexador/rate_percent only apply to type = 'renda_fixa'. Meaning of
  -- rate_percent depends on indexador (see src/lib/finance/investment-yield.ts):
  --   prefixado   -> fixed nominal annual rate itself (e.g. 11.5 = 11.5% a.a.)
  --   cdi/selic   -> percentage OF the index (e.g. 100 = 100% CDI)
  --   ipca        -> spread added to IPCA, in percentage points (e.g. 6 = "IPCA + 6% a.a.")
  indexador text check (indexador in ('cdi', 'ipca', 'selic', 'prefixado')),
  rate_percent numeric(7, 4) check (rate_percent >= 0),
  institution text,
  ticker text,
  notes text,
  start_date date not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint renda_fixa_requires_rate check (
    type <> 'renda_fixa' or (indexador is not null and rate_percent is not null)
  ),
  constraint non_renda_fixa_has_no_rate check (
    type = 'renda_fixa' or (indexador is null and rate_percent is null)
  )
);

create index investments_user_id_idx on public.investments (user_id);
create index investments_user_type_idx on public.investments (user_id, type);

alter table public.investments enable row level security;
alter table public.investments force row level security;

create policy "investments_select_own" on public.investments
  for select using (user_id = (select auth.uid()));
create policy "investments_insert_own" on public.investments
  for insert with check (user_id = (select auth.uid()));
create policy "investments_update_own" on public.investments
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "investments_delete_own" on public.investments
  for delete using (user_id = (select auth.uid()));

create trigger investments_set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();
