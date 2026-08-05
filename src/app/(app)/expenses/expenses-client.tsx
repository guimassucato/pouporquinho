"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseFormDialog } from "@/components/forms/expense-form-dialog";
import { deleteExpense } from "@/actions/expenses";
import { getCategoryIcon, getPaymentMethodIcon } from "@/lib/finance/icons";
import { formatCurrency, formatDate, formatMonth } from "@/lib/finance/format";
import type { Tables } from "@/types/database.types";

type Expense = Tables<"expenses">;
type Category = Tables<"categories">;
type PaymentMethod = Tables<"payment_methods">;

const ALL = "__all__";

function shiftMonth(monthIso: string, delta: number) {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

export function ExpensesClient({
  expenses,
  categories,
  paymentMethods,
  month,
}: {
  expenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  month: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(ALL);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    expense: Expense | null;
  }>({ open: false, expense: null });
  const [isPending, startTransition] = useTransition();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const paymentMethodById = useMemo(
    () => new Map(paymentMethods.map((pm) => [pm.id, pm])),
    [paymentMethods]
  );

  const filtered = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (categoryFilter === ALL || e.category_id === categoryFilter) &&
          (paymentMethodFilter === ALL || e.payment_method_id === paymentMethodFilter)
      ),
    [expenses, categoryFilter, paymentMethodFilter]
  );

  const total = useMemo(
    () => filtered.reduce((sum, e) => sum + e.amount, 0),
    [filtered]
  );

  function handleDelete(expense: Expense) {
    if (!confirm(`Excluir a despesa "${expense.description}"?`)) return;
    startTransition(async () => {
      const result = await deleteExpense(expense.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Despesa excluída");
    });
  }

  const monthLabel = formatMonth(month);

  return (
    <div>
      <PageHeader
        title="Despesas"
        description="Lançamento e histórico de despesas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/expenses/import" />}>
              <FileUp /> Importar fatura
            </Button>
            <Button onClick={() => setDialogState({ open: true, expense: null })}>
              <Plus /> Nova despesa
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            render={
              <Link href={`/expenses?month=${shiftMonth(month, -1)}`} aria-label="Mês anterior" />
            }
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-36 px-2 text-center text-sm font-medium capitalize">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            render={
              <Link href={`/expenses?month=${shiftMonth(month, 1)}`} aria-label="Próximo mês" />
            }
          >
            <ChevronRight />
          </Button>
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value ?? ALL)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Categoria">
              {(value: string) => {
                if (value === ALL || !value) return "Todas as categorias";
                return categoryById.get(value)?.name ?? "Todas as categorias";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentMethodFilter}
          onValueChange={(value) => setPaymentMethodFilter(value ?? ALL)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Forma de pagamento">
              {(value: string) => {
                if (value === ALL || !value) return "Todas as formas";
                return paymentMethodById.get(value)?.name ?? "Todas as formas";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as formas</SelectItem>
            {paymentMethods.map((pm) => (
              <SelectItem key={pm.id} value={pm.id}>
                {pm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Forma de pagamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhuma despesa neste período.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((expense) => {
              const category = categoryById.get(expense.category_id);
              const paymentMethod = paymentMethodById.get(expense.payment_method_id);
              const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
              const PaymentIcon = paymentMethod
                ? getPaymentMethodIcon(paymentMethod.icon)
                : null;
              return (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>{expense.description}</TableCell>
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
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setDialogState({ open: true, expense })}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(expense)}
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
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <ExpenseFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        expense={dialogState.expense}
        categories={categories}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
