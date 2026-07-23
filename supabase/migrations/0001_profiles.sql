-- Profiles: 1:1 extension of auth.users, created automatically via trigger.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  currency text not null default 'BRL',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- No insert/delete policy: rows are only created by the trigger below
-- (security definer) and removed via the auth.users cascade.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
