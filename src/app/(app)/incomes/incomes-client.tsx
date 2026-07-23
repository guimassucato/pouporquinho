"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
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
import { IncomeFormDialog } from "@/components/forms/income-form-dialog";
import { deleteIncome } from "@/actions/incomes";
import { getCategoryIcon } from "@/lib/finance/icons";
import { formatCurrency, formatDate, formatMonth } from "@/lib/finance/format";
import type { Tables } from "@/types/database.types";

type Income = Tables<"incomes">;
type Category = Tables<"categories">;

const ALL = "__all__";

function shiftMonth(monthIso: string, delta: number) {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

export function IncomesClient({
  incomes,
  categories,
  month,
}: {
  incomes: Income[];
  categories: Category[];
  month: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    income: Income | null;
  }>({ open: false, income: null });
  const [isPending, startTransition] = useTransition();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(
    () =>
      incomes.filter(
        (i) => categoryFilter === ALL || i.category_id === categoryFilter
      ),
    [incomes, categoryFilter]
  );

  const total = useMemo(
    () => filtered.reduce((sum, i) => sum + i.amount, 0),
    [filtered]
  );

  function handleDelete(income: Income) {
    if (!confirm(`Excluir a receita "${income.description}"?`)) return;
    startTransition(async () => {
      const result = await deleteIncome(income.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Receita excluída");
    });
  }

  const monthLabel = formatMonth(month);

  return (
    <div>
      <PageHeader
        title="Receitas"
        description="Entradas e fluxo de caixa"
        actions={
          <Button onClick={() => setDialogState({ open: true, income: null })}>
            <Plus /> Nova receita
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            render={
              <Link href={`/incomes?month=${shiftMonth(month, -1)}`} aria-label="Mês anterior" />
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
              <Link href={`/incomes?month=${shiftMonth(month, 1)}`} aria-label="Próximo mês" />
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
            <SelectValue placeholder="Categoria" />
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
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhuma receita neste período.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((income) => {
              const category = income.category_id
                ? categoryById.get(income.category_id)
                : null;
              const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
              return (
                <TableRow key={income.id}>
                  <TableCell>{formatDate(income.income_date)}</TableCell>
                  <TableCell>{income.description}</TableCell>
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
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(income.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setDialogState({ open: true, income })}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(income)}
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
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <IncomeFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        income={dialogState.income}
        categories={categories}
      />
    </div>
  );
}
