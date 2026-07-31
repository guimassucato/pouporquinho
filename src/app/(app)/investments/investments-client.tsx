"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Cell, Pie, PieChart } from "recharts";
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, ChevronRight, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageHeader } from "@/components/layout/page-header";
import { InvestmentFormDialog } from "@/components/forms/investment-form-dialog";
import { deleteInvestment, setInvestmentArchived } from "@/actions/investments";
import { computePortfolioSummary } from "@/lib/finance/investment-portfolio";
import { formatCurrency } from "@/lib/finance/format";
import {
  INVESTMENT_TYPE_COLORS,
  INVESTMENT_TYPE_LABELS,
  formatInvestmentRate,
  getInvestmentTypeIcon,
} from "@/lib/finance/investment-labels";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

type Investment = Tables<"investments">;
type InvestmentTransaction = Tables<"investment_transactions">;
type InvestmentValuation = Tables<"investment_valuations">;
type IndexRate = Tables<"index_rates">;
type RecurringInvestmentContribution = Tables<"recurring_investment_contributions">;

export function InvestmentsClient({
  asOfDate,
  investments,
  transactions,
  valuations,
  indexRates,
  recurringContributions,
}: {
  asOfDate: string;
  investments: Investment[];
  transactions: InvestmentTransaction[];
  valuations: InvestmentValuation[];
  indexRates: IndexRate[];
  recurringContributions: RecurringInvestmentContribution[];
}) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    investment: Investment | null;
  }>({ open: false, investment: null });
  const [isPending, startTransition] = useTransition();

  const activeInvestments = useMemo(
    () => investments.filter((i) => !i.is_archived),
    [investments]
  );

  const summary = useMemo(
    () =>
      computePortfolioSummary(activeInvestments, transactions, valuations, indexRates, asOfDate),
    [activeInvestments, transactions, valuations, indexRates, asOfDate]
  );

  const totalCostBasis = useMemo(
    () => Array.from(summary.perInvestment.values()).reduce((sum, v) => sum + v.costBasis, 0),
    [summary]
  );
  const totalAccruedYield = summary.totalInvested - totalCostBasis;

  const recurringByInvestment = useMemo(
    () => new Set(recurringContributions.map((r) => r.investment_id)),
    [recurringContributions]
  );

  const pieData = useMemo(
    () =>
      Array.from(summary.byType.entries())
        .filter(([, value]) => value > 0)
        .map(([type, value]) => ({
          type,
          name: INVESTMENT_TYPE_LABELS[type] ?? type,
          value,
          color: INVESTMENT_TYPE_COLORS[type] ?? "#64748b",
        }))
        .sort((a, b) => b.value - a.value),
    [summary]
  );

  function handleDelete(investment: Investment) {
    if (
      !confirm(
        `Excluir "${investment.name}"? Isso apaga todo o histórico de aportes, resgates e avaliações desse investimento.`
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteInvestment(investment.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Investimento excluído");
    });
  }

  function handleToggleArchive(investment: Investment) {
    startTransition(async () => {
      const result = await setInvestmentArchived(investment.id, !investment.is_archived);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(investment.is_archived ? "Reativado" : "Arquivado");
    });
  }

  return (
    <div>
      <PageHeader
        title="Investimentos"
        description="Portfólio, aportes e rendimentos"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/investments/rates" />}>
              <Percent /> Taxas de índice
            </Button>
            <Button onClick={() => setDialogState({ open: true, investment: null })}>
              <Plus /> Novo investimento
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Patrimônio investido</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatCurrency(summary.totalInvested)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total aportado</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(totalCostBasis)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Rendimento acumulado</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                totalAccruedYield >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              )}
            >
              {formatCurrency(totalAccruedYield)}
            </p>
          </CardContent>
        </Card>
      </div>

      {pieData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Alocação por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={
                Object.fromEntries(
                  pieData.map((d) => [d.type, { label: d.name, color: d.color }])
                ) as ChartConfig
              }
              className="mx-auto max-h-72"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="type" hideLabel />} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="type"
                  innerRadius={60}
                  outerRadius={100}
                  strokeWidth={2}
                  stroke="var(--card)"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.type} fill={entry.color} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="type" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investimento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead className="text-right">Valor atual</TableHead>
              <TableHead className="text-right">Rendimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum investimento cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
            {investments.map((investment) => {
              const Icon = getInvestmentTypeIcon(investment.type);
              const position = summary.perInvestment.get(investment.id);
              const currentValue = position?.currentValue ?? 0;
              const accruedYield = position?.accruedYield ?? 0;
              return (
                <TableRow key={investment.id}>
                  <TableCell>
                    <Link
                      href={`/investments/${investment.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      {investment.name}
                      {recurringByInvestment.has(investment.id) && (
                        <Badge variant="outline" className="ml-1">
                          Aporte recorrente
                        </Badge>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {INVESTMENT_TYPE_LABELS[investment.type] ?? investment.type}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatInvestmentRate(investment)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(currentValue)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      accruedYield >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    )}
                  >
                    {formatCurrency(accruedYield)}
                  </TableCell>
                  <TableCell>
                    {investment.is_archived ? (
                      <Badge variant="secondary">Arquivado</Badge>
                    ) : (
                      <Badge variant="outline">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <Link
                            href={`/investments/${investment.id}`}
                            aria-label="Ver detalhes"
                          />
                        }
                      >
                        <ChevronRight />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setDialogState({ open: true, investment })}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleToggleArchive(investment)}
                        aria-label={investment.is_archived ? "Reativar" : "Arquivar"}
                      >
                        {investment.is_archived ? <ArchiveRestore /> : <Archive />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(investment)}
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

      <InvestmentFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        investment={dialogState.investment}
      />
    </div>
  );
}
