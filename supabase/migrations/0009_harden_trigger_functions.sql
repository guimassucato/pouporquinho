-- Pin search_path to prevent hijacking via a mutable search_path.
alter function public.set_updated_at() set search_path = '';

-- These functions exist only to back triggers; they must not be callable
-- directly via PostgREST RPC by anon/authenticated roles.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
