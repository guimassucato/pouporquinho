-- Single-column indexes covering FK columns not already covered by a
-- leading-column composite index.
create index budgets_category_id_idx on public.budgets (category_id);
create index expenses_category_id_idx on public.expenses (category_id);
create index expenses_payment_method_id_idx on public.expenses (payment_method_id);
create index incomes_category_id_idx on public.incomes (category_id);
create index recurring_expenses_category_id_idx on public.recurring_expenses (category_id);
create index recurring_expenses_payment_method_id_idx on public.recurring_expenses (payment_method_id);

-- Wrap auth.uid() as (select auth.uid()) in every RLS policy so Postgres
-- evaluates it once per query instead of once per row.
drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy "categories_select_own" on public.categories;
drop policy "categories_insert_own" on public.categories;
drop policy "categories_update_own" on public.categories;
drop policy "categories_delete_own" on public.categories;
create policy "categories_select_own" on public.categories for select using (user_id = (select auth.uid()));
create policy "categories_insert_own" on public.categories for insert with check (user_id = (select auth.uid()));
create policy "categories_update_own" on public.categories for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories_delete_own" on public.categories for delete using (user_id = (select auth.uid()));

drop policy "payment_methods_select_own" on public.payment_methods;
drop policy "payment_methods_insert_own" on public.payment_methods;
drop policy "payment_methods_update_own" on public.payment_methods;
drop policy "payment_methods_delete_own" on public.payment_methods;
create policy "payment_methods_select_own" on public.payment_methods for select using (user_id = (select auth.uid()));
create policy "payment_methods_insert_own" on public.payment_methods for insert with check (user_id = (select auth.uid()));
create policy "payment_methods_update_own" on public.payment_methods for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "payment_methods_delete_own" on public.payment_methods for delete using (user_id = (select auth.uid()));

drop policy "expenses_select_own" on public.expenses;
drop policy "expenses_insert_own" on public.expenses;
drop policy "expenses_update_own" on public.expenses;
drop policy "expenses_delete_own" on public.expenses;
create policy "expenses_select_own" on public.expenses for select using (user_id = (select auth.uid()));
create policy "expenses_insert_own" on public.expenses for insert with check (user_id = (select auth.uid()));
create policy "expenses_update_own" on public.expenses for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "expenses_delete_own" on public.expenses for delete using (user_id = (select auth.uid()));

drop policy "incomes_select_own" on public.incomes;
drop policy "incomes_insert_own" on public.incomes;
drop policy "incomes_update_own" on public.incomes;
drop policy "incomes_delete_own" on public.incomes;
create policy "incomes_select_own" on public.incomes for select using (user_id = (select auth.uid()));
create policy "incomes_insert_own" on public.incomes for insert with check (user_id = (select auth.uid()));
create policy "incomes_update_own" on public.incomes for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "incomes_delete_own" on public.incomes for delete using (user_id = (select auth.uid()));

drop policy "budgets_select_own" on public.budgets;
drop policy "budgets_insert_own" on public.budgets;
drop policy "budgets_update_own" on public.budgets;
drop policy "budgets_delete_own" on public.budgets;
create policy "budgets_select_own" on public.budgets for select using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets for insert with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets for delete using (user_id = (select auth.uid()));

drop policy "recurring_expenses_select_own" on public.recurring_expenses;
drop policy "recurring_expenses_insert_own" on public.recurring_expenses;
drop policy "recurring_expenses_update_own" on public.recurring_expenses;
drop policy "recurring_expenses_delete_own" on public.recurring_expenses;
create policy "recurring_expenses_select_own" on public.recurring_expenses for select using (user_id = (select auth.uid()));
create policy "recurring_expenses_insert_own" on public.recurring_expenses for insert with check (user_id = (select auth.uid()));
create policy "recurring_expenses_update_own" on public.recurring_expenses for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "recurring_expenses_delete_own" on public.recurring_expenses for delete using (user_id = (select auth.uid()));
