-- Personal access tokens for external clients (e.g. the MCP endpoint used by
-- AI agents). Only the SHA-256 hash of the token is stored; the plaintext is
-- shown to the user once at creation. Revoking a token = deleting the row.
--
-- The MCP endpoint looks tokens up with the secret (service role) key, so it
-- bypasses RLS here; the policies below only govern the settings UI, where
-- the user lists/creates/revokes their own tokens. There is no update policy:
-- last_used_at is only ever touched by the service role.
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index api_tokens_user_id_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;
alter table public.api_tokens force row level security;

create policy "api_tokens_select_own" on public.api_tokens
  for select using (user_id = (select auth.uid()));
create policy "api_tokens_insert_own" on public.api_tokens
  for insert with check (user_id = (select auth.uid()));
create policy "api_tokens_delete_own" on public.api_tokens
  for delete using (user_id = (select auth.uid()));
