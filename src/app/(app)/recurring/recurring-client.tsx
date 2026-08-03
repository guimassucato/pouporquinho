"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { RecurringExpenseFormDialog } from "@/components/forms/recurring-expense-form-dialog";
import { RecurringIncomeFormDialog } from "@/components/forms/recurring-income-form-dialog";
import { deleteRecurringExpense } from "@/actions/recurring-expenses";
import { deleteRecurringIncome } from "@/actions/recurring-incomes";
import { getCategoryIcon, getPaymentMethodIcon } from "@/lib/finance/icons";
import { formatCurrency, formatDate } from "@/lib/finance/format";
import type { Tables } from "@/types/database.types";

type RecurringExpense = Tables<"recurring_expenses">;
type RecurringIncome = Tables<"recurring_incomes">;
type Category = Tables<"categories">;
type PaymentMethod = Tables<"payment_methods">;

function RecurringExpensesSection({
  recurringExpenses,
  categories,
  paymentMethods,
}: {
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const paymentMethodById = new Map(paymentMethods.map((pm) => [pm.id, pm]));

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    recurringExpense: RecurringExpense | null;
  }>({ open: false, recurringExpense: null });
  const [isPending, startTransition] = useTransition();

  function handleDelete(re: RecurringExpense) {
    if (!confirm(`Excluir a recorrência "${re.description}"?`)) return;
    startTransition(async () => {
      const result = await deleteRecurringExpense(re.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Recorrência excluída");
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => setDialogState({ open: true, recurringExpense: null })}
        >
          <Plus /> Nova recorrência
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Forma de pagamento</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhuma despesa recorrente cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {recurringExpenses.map((re) => {
              const category = categoryById.get(re.category_id);
              const paymentMethod = paymentMethodById.get(re.payment_method_id);
              const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
              const PaymentIcon = paymentMethod
                ? getPaymentMethodIcon(paymentMethod.icon)
                : null;
              return (
                <TableRow key={re.id}>
                  <TableCell>{re.description}</TableCell>
                  <TableCell>
                    {category && CategoryIcon && (
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon
                          className="size-3.5"
                          style={{ color: category.color }}
                        />
                        {category.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {paymentMethod && PaymentIcon && (
                      <div className="flex items-center gap-1.5">
                        <PaymentIcon
                          className="size-3.5"
                          style={{ color: paymentMethod.color }}
                        />
                        {paymentMethod.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>Dia {re.day_of_month}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(re.start_date)}
                    {re.end_date ? ` – ${formatDate(re.end_date)}` : " – sem fim"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(re.amount)}
                  </TableCell>
                  <TableCell>
                    {re.is_active ? (
                      <Badge variant="outline">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() =>
                          setDialogState({ open: true, recurringExpense: re })
                        }
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(re)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecurringExpenseFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        recurringExpense={dialogState.recurringExpense}
        categories={categories}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}

function RecurringIncomesSection({
  recurringIncomes,
  categories,
}: {
  recurringIncomes: RecurringIncome[];
  categories: Category[];
}) {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    recurringIncome: RecurringIncome | null;
  }>({ open: false, recurringIncome: null });
  const [isPending, startTransition] = useTransition();

  function handleDelete(ri: RecurringIncome) {
    if (!confirm(`Excluir a recorrência "${ri.description}"?`)) return;
    startTransition(async () => {
      const result = await deleteRecurringIncome(ri.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Recorrência excluída");
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => setDialogState({ open: true, recurringIncome: null })}
        >
          <Plus /> Nova recorrência
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringIncomes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhuma receita recorrente cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {recurringIncomes.map((ri) => {
              const category = ri.category_id ? categoryById.get(ri.category_id) : null;
              const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
              return (
                <TableRow key={ri.id}>
                  <TableCell>{ri.description}</TableCell>
                  <TableCell>
                    {category && CategoryIcon ? (
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon
                          className="size-3.5"
                          style={{ color: category.color }}
                        />
                        {category.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>Dia {ri.day_of_month}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(ri.start_date)}
                    {ri.end_date ? ` – ${formatDate(ri.end_date)}` : " – sem fim"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(ri.amount)}
                  </TableCell>
                  <TableCell>
                    {ri.is_active ? (
                      <Badge variant="outline">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() =>
                          setDialogState({ open: true, recurringIncome: ri })
                        }
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(ri)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <RecurringIncomeFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        recurringIncome={dialogState.recurringIncome}
        categories={categories}
      />
    </div>
  );
}

export function RecurringClient({
  recurringExpenses,
  recurringIncomes,
  expenseCategories,
  incomeCategories,
  paymentMethods,
}: {
  recurringExpenses: RecurringExpense[];
  recurringIncomes: RecurringIncome[];
  expenseCategories: Category[];
  incomeCategories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  return (
    <div>
      <PageHeader
        title="Recorrentes"
        description="Contas fixas e receitas lançadas automaticamente todo mês"
      />

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="incomes">Receitas</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <RecurringExpensesSection
            recurringExpenses={recurringExpenses}
            categories={expenseCategories}
            paymentMethods={paymentMethods}
          />
        </TabsContent>
        <TabsContent value="incomes">
          <RecurringIncomesSection
            recurringIncomes={recurringIncomes}
            categories={incomeCategories}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
