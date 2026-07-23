-- security_invoker makes these views run with the querying user's permissions,
-- so they inherit the RLS policies of expenses/incomes/categories automatically.

create view public.expenses_by_category_month
with (security_invoker = true) as
select
  user_id,
  category_id,
  date_trunc('month', expense_date)::date as month,
  sum(amount) as total
from public.expenses
group by user_id, category_id, date_trunc('month', expense_date)::date;

create view public.expenses_by_payment_method_month
with (security_invoker = true) as
select
  user_id,
  payment_method_id,
  date_trunc('month', expense_date)::date as month,
  sum(amount) as total
from public.expenses
group by user_id, payment_method_id, date_trunc('month', expense_date)::date;

create view public.monthly_cashflow
with (security_invoker = true) as
select
  user_id,
  month,
  sum(income_total) as income_total,
  sum(expense_total) as expense_total
from (
  select user_id, date_trunc('month', income_date)::date as month, amount as income_total, 0 as expense_total
  from public.incomes
  union all
  select user_id, date_trunc('month', expense_date)::date as month, 0 as income_total, amount as expense_total
  from public.expenses
) combined
group by user_id, month;
