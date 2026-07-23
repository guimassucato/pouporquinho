-- The partial unique index couldn't be targeted by a plain ON CONFLICT
-- (col1, col2) clause. A regular unique constraint works identically here:
-- Postgres already treats NULLs as distinct, so rows with
-- recurring_expense_id IS NULL never conflict with each other.
drop index if exists public.expenses_recurring_month_uidx;

alter table public.expenses
  add constraint expenses_recurring_month_key
  unique (recurring_expense_id, generated_for_month);
