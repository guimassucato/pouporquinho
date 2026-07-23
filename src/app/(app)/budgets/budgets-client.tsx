"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { BudgetFormDialog } from "@/components/forms/budget-form-dialog";
import { deleteBudget } from "@/actions/budgets";
import { getCategoryIcon } from "@/lib/finance/icons";
import { formatCurrency, formatMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

type Budget = Tables<"budgets">;
type Category = Tables<"categories">;

function shiftMonth(monthIso: string, delta: number) {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

export function BudgetsClient({
  budgets,
  categories,
  spentByCategory,
  month,
}: {
  budgets: Budget[];
  categories: Category[];
  spentByCategory: Record<string, number>;
  month: string;
}) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    budget: Budget | null;
  }>({ open: false, budget: null });
  const [isPending, startTransition] = useTransition();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const budgetedCategoryIds = useMemo(
    () => new Set(budgets.map((b) => b.category_id)),
    [budgets]
  );

  const availableCategories = useMemo(
    () => categories.filter((c) => !budgetedCategoryIds.has(c.id)),
    [categories, budgetedCategoryIds]
  );

  function handleDelete(budget: Budget) {
    const category = categoryById.get(budget.category_id);
    if (!confirm(`Excluir o orçamento de "${category?.name ?? "categoria"}"?`)) return;
    startTransition(async () => {
      const result = await deleteBudget(budget.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Orçamento excluído");
    });
  }

  const monthLabel = formatMonth(month);

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        description="Limite de gastos por categoria e mês"
        actions={
          <Button onClick={() => setDialogState({ open: true, budget: null })}>
            <Plus /> Novo orçamento
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-1 rounded-lg border bg-card p-1 w-fit">
        <Button
          variant="ghost"
          size="icon-sm"
          render={
            <Link href={`/budgets?month=${shiftMonth(month, -1)}`} aria-label="Mês anterior" />
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
            <Link href={`/budgets?month=${shiftMonth(month, 1)}`} aria-label="Próximo mês" />
          }
        >
          <ChevronRight />
        </Button>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum orçamento definido para {monthLabel}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const category = categoryById.get(budget.category_id);
            if (!category) return null;
            const Icon = getCategoryIcon(category.icon);
            const spent = spentByCategory[budget.category_id] ?? 0;
            const percent = Math.min(
              100,
              Math.round((spent / budget.amount_limit) * 100)
            );
            const isOver = spent > budget.amount_limit;
            const isNearLimit = !isOver && percent >= 80;

            return (
              <Card key={budget.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex size-7 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setDialogState({ open: true, budget })}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(budget)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <Progress
                    value={percent}
                    className={cn(
                      "[&_[data-slot=progress-indicator]]:bg-primary",
                      isOver && "[&_[data-slot=progress-indicator]]:bg-destructive",
                      isNearLimit && "[&_[data-slot=progress-indicator]]:bg-amber-500"
                    )}
                  />

                  <div className="flex items-baseline justify-between text-sm">
                    <span
                      className={cn(
                        "font-medium",
                        isOver && "text-destructive"
                      )}
                    >
                      {formatCurrency(spent)}
                    </span>
                    <span className="text-muted-foreground">
                      de {formatCurrency(budget.amount_limit)}
                    </span>
                  </div>
                  {isOver && (
                    <p className="text-xs text-destructive">
                      Orçamento estourado em {formatCurrency(spent - budget.amount_limit)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        budget={dialogState.budget}
        categories={dialogState.budget ? categories : availableCategories}
        month={month}
      />
    </div>
  );
}
