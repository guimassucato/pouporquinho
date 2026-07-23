"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/layout/page-header";
import { getPaymentMethodIcon } from "@/lib/finance/icons";
import { formatCurrency, formatMonth } from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

type Category = Tables<"categories">;
type PaymentMethod = Tables<"payment_methods">;
type Budget = Tables<"budgets">;

const cashflowConfig: ChartConfig = {
  income: {
    label: "Receitas",
    theme: { light: "#008300", dark: "#008300" },
  },
  expense: {
    label: "Despesas",
    theme: { light: "#e34948", dark: "#e66767" },
  },
};

function shortMonthLabel(monthIso: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(new Date(`${monthIso}T00:00:00Z`))
    .replace(".", "");
}

export function DashboardClient({
  month,
  trendMonths,
  categories,
  paymentMethods,
  expensesByCategory,
  expensesByPaymentMethod,
  cashflow,
  budgets,
}: {
  month: string;
  trendMonths: string[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  expensesByCategory: { category_id: string | null; total: number | null }[];
  expensesByPaymentMethod: { payment_method_id: string | null; total: number | null }[];
  cashflow: { month: string | null; income_total: number | null; expense_total: number | null }[];
  budgets: Budget[];
}) {
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const paymentMethodById = useMemo(
    () => new Map(paymentMethods.map((pm) => [pm.id, pm])),
    [paymentMethods]
  );

  const totalExpense = expensesByCategory.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const currentCashflow = cashflow.find((c) => c.month === month);
  const totalIncome = currentCashflow?.income_total ?? 0;
  const balance = totalIncome - totalExpense;

  const topCategory = useMemo(() => {
    const sorted = [...expensesByCategory].sort(
      (a, b) => (b.total ?? 0) - (a.total ?? 0)
    );
    const top = sorted[0];
    if (!top?.category_id) return null;
    return categoryById.get(top.category_id) ?? null;
  }, [expensesByCategory, categoryById]);

  const budgetSummary = useMemo(() => {
    if (budgets.length === 0) return null;
    const spentByCategory = new Map(
      expensesByCategory.map((r) => [r.category_id, r.total ?? 0])
    );
    const totalLimit = budgets.reduce((sum, b) => sum + b.amount_limit, 0);
    const totalSpent = budgets.reduce(
      (sum, b) => sum + (spentByCategory.get(b.category_id) ?? 0),
      0
    );
    return { totalLimit, totalSpent, percent: Math.round((totalSpent / totalLimit) * 100) };
  }, [budgets, expensesByCategory]);

  const pieData = useMemo(
    () =>
      expensesByCategory
        .filter((r) => r.category_id && (r.total ?? 0) > 0)
        .map((r) => {
          const category = categoryById.get(r.category_id!);
          return {
            categoryId: r.category_id!,
            name: category?.name ?? "—",
            value: r.total ?? 0,
            color: category?.color ?? "#64748b",
          };
        })
        .sort((a, b) => b.value - a.value),
    [expensesByCategory, categoryById]
  );

  const trendData = useMemo(
    () =>
      trendMonths.map((m) => {
        const row = cashflow.find((c) => c.month === m);
        return {
          month: m,
          label: shortMonthLabel(m),
          income: row?.income_total ?? 0,
          expense: row?.expense_total ?? 0,
        };
      }),
    [trendMonths, cashflow]
  );

  const paymentMethodData = useMemo(
    () =>
      expensesByPaymentMethod
        .filter((r) => r.payment_method_id && (r.total ?? 0) > 0)
        .map((r) => ({
          paymentMethod: paymentMethodById.get(r.payment_method_id!),
          total: r.total ?? 0,
        }))
        .sort((a, b) => b.total - a.total),
    [expensesByPaymentMethod, paymentMethodById]
  );
  const maxPaymentMethodTotal = Math.max(1, ...paymentMethodData.map((r) => r.total));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Visão geral de ${formatMonth(month)}`}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo do mês"
          value={formatCurrency(balance)}
          icon={Wallet}
          valueClassName={balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
        />
        <StatCard
          label="Total recebido"
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Total gasto"
          value={formatCurrency(totalExpense)}
          icon={TrendingDown}
          valueClassName="text-destructive"
        />
        {budgetSummary ? (
          <StatCard
            label="Orçamento consumido"
            value={`${budgetSummary.percent}%`}
            icon={PiggyBank}
            valueClassName={
              budgetSummary.percent >= 100
                ? "text-destructive"
                : budgetSummary.percent >= 80
                  ? "text-amber-600 dark:text-amber-400"
                  : undefined
            }
          />
        ) : (
          <StatCard
            label="Categoria com maior gasto"
            value={topCategory?.name ?? "—"}
            icon={PiggyBank}
          />
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gasto por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma despesa neste mês.
              </p>
            ) : (
              <ChartContainer
                config={Object.fromEntries(
                  pieData.map((d) => [d.categoryId, { label: d.name, color: d.color }])
                )}
                className="mx-auto max-h-72"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="categoryId" hideLabel />}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="categoryId"
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="categoryId" />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cashflowConfig} className="max-h-72 w-full">
              <BarChart data={trendData}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  className="capitalize"
                />
                <YAxis tickLine={false} axisLine={false} width={0} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gasto por forma de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethodData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa neste mês.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {paymentMethodData.map(({ paymentMethod, total }) => {
                if (!paymentMethod) return null;
                const Icon = getPaymentMethodIcon(paymentMethod.icon);
                const percent = Math.round((total / maxPaymentMethodTotal) * 100);
                return (
                  <div key={paymentMethod.id} className="flex items-center gap-3">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: paymentMethod.color }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{paymentMethod.name}</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: paymentMethod.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("truncate text-lg font-semibold tabular-nums", valueClassName)}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
