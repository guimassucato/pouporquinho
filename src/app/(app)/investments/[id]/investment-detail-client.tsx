"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
} from "lucide-react";
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
import { PageHeader } from "@/components/layout/page-header";
import { InvestmentFormDialog } from "@/components/forms/investment-form-dialog";
import { InvestmentTransactionFormDialog } from "@/components/forms/investment-transaction-form-dialog";
import { InvestmentValuationFormDialog } from "@/components/forms/investment-valuation-form-dialog";
import { RecurringInvestmentContributionFormDialog } from "@/components/forms/recurring-investment-contribution-form-dialog";
import { deleteInvestment, setInvestmentArchived } from "@/actions/investments";
import { deleteInvestmentTransaction } from "@/actions/investment-transactions";
import { deleteInvestmentValuation } from "@/actions/investment-valuations";
import { deleteRecurringInvestmentContribution } from "@/actions/recurring-investment-contributions";
import { computeInvestmentCurrentValue } from "@/lib/finance/investment-portfolio";
import {
  computeAccruedYield,
  type InvestmentCashFlow,
  type InvestmentTransactionType,
} from "@/lib/finance/investment-yield";
import { formatCurrency, formatDate } from "@/lib/finance/format";
import {
  INVESTMENT_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatInvestmentRate,
} from "@/lib/finance/investment-labels";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

type Investment = Tables<"investments">;
type InvestmentTransaction = Tables<"investment_transactions">;
type InvestmentValuation = Tables<"investment_valuations">;
type IndexRate = Tables<"index_rates">;
type RecurringInvestmentContribution = Tables<"recurring_investment_contributions">;

export function InvestmentDetailClient({
  asOfDate,
  investment,
  transactions,
  valuations,
  indexRates,
  recurringContributions,
}: {
  asOfDate: string;
  investment: Investment;
  transactions: InvestmentTransaction[];
  valuations: InvestmentValuation[];
  indexRates: IndexRate[];
  recurringContributions: RecurringInvestmentContribution[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [transactionDialog, setTransactionDialog] = useState<{
    open: boolean;
    defaultType: InvestmentTransactionType;
    transaction: InvestmentTransaction | null;
  }>({ open: false, defaultType: "aporte", transaction: null });
  const [valuationDialog, setValuationDialog] = useState<{
    open: boolean;
    valuation: InvestmentValuation | null;
  }>({ open: false, valuation: null });
  const [recurringDialog, setRecurringDialog] = useState<{
    open: boolean;
    recurringContribution: RecurringInvestmentContribution | null;
  }>({ open: false, recurringContribution: null });

  const isRendaFixa = investment.type === "renda_fixa";

  // Already ordered desc by valuation_date from the server query.
  const latestValuation = valuations[0];

  const currentValue = useMemo(
    () =>
      computeInvestmentCurrentValue(
        investment,
        transactions,
        latestValuation,
        indexRates,
        asOfDate
      ),
    [investment, transactions, latestValuation, indexRates, asOfDate]
  );

  const cashFlows: InvestmentCashFlow[] = useMemo(
    () =>
      transactions.map((t) => ({
        type: t.type as InvestmentTransactionType,
        amount: t.amount,
        date: t.transaction_date,
      })),
    [transactions]
  );

  const accruedYield = useMemo(
    () => computeAccruedYield(currentValue, cashFlows),
    [currentValue, cashFlows]
  );

  const costBasis = currentValue - accruedYield;

  const recurringContribution = recurringContributions[0] ?? null;

  function handleDelete() {
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
      router.push("/investments");
    });
  }

  function handleToggleArchive() {
    startTransition(async () => {
      const result = await setInvestmentArchived(investment.id, !investment.is_archived);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(investment.is_archived ? "Reativado" : "Arquivado");
    });
  }

  function handleDeleteTransaction(t: InvestmentTransaction) {
    if (!confirm(`Excluir esta transação de ${formatCurrency(t.amount)}?`)) return;
    startTransition(async () => {
      const result = await deleteInvestmentTransaction(t.id, investment.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Transação excluída");
    });
  }

  function handleDeleteValuation(v: InvestmentValuation) {
    if (!confirm(`Excluir a avaliação de ${formatDate(v.valuation_date)}?`)) return;
    startTransition(async () => {
      const result = await deleteInvestmentValuation(v.id, investment.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Avaliação excluída");
    });
  }

  function handleDeleteRecurring(r: RecurringInvestmentContribution) {
    if (!confirm("Excluir o aporte recorrente?")) return;
    startTransition(async () => {
      const result = await deleteRecurringInvestmentContribution(r.id, investment.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Aporte recorrente excluído");
    });
  }

  return (
    <div>
      <Link
        href="/investments"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Investimentos
      </Link>

      <PageHeader
        title={investment.name}
        description={INVESTMENT_TYPE_LABELS[investment.type] ?? investment.type}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Editar
            </Button>
            <Button variant="outline" disabled={isPending} onClick={handleToggleArchive}>
              {investment.is_archived ? <ArchiveRestore /> : <Archive />}
              {investment.is_archived ? "Reativar" : "Arquivar"}
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              <Trash2 /> Excluir
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Valor investido líquido</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(costBasis)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Rendimento acumulado</p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                accruedYield >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              )}
            >
              {formatCurrency(accruedYield)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Valor atual</p>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(currentValue)}</p>
          </CardContent>
        </Card>
      </div>

      {isRendaFixa ? (
        <Card className="mb-6">
          <CardContent className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Landmark className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{formatInvestmentRate(investment)}</p>
              <p className="text-xs text-muted-foreground">
                Valor calculado automaticamente por juros compostos (act/365) a partir dos
                aportes e resgates. É uma estimativa, não um valor oficial da instituição.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Avaliações</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setValuationDialog({ open: true, valuation: null })}
            >
              <Plus /> Nova avaliação
            </Button>
          </CardHeader>
          <CardContent>
            {valuations.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma avaliação registrada ainda. O valor atual usa o custo aportado até que
                uma avaliação seja registrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuations.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{formatDate(v.valuation_date)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(v.total_value)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isPending}
                            onClick={() => setValuationDialog({ open: true, valuation: v })}
                            aria-label="Editar"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isPending}
                            onClick={() => handleDeleteValuation(v)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Aporte recorrente</CardTitle>
          {!recurringContribution && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRecurringDialog({ open: true, recurringContribution: null })}
            >
              <Plus /> Configurar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recurringContribution ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">
                  {formatCurrency(recurringContribution.amount)} todo dia{" "}
                  {recurringContribution.day_of_month}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(recurringContribution.start_date)}
                  {recurringContribution.end_date
                    ? ` – ${formatDate(recurringContribution.end_date)}`
                    : " – sem fim"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {recurringContribution.is_active ? (
                  <Badge variant="outline">Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => setRecurringDialog({ open: true, recurringContribution })}
                  aria-label="Editar"
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => handleDeleteRecurring(recurringContribution)}
                  aria-label="Excluir"
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum aporte recorrente configurado para este investimento.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Transações</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setTransactionDialog({ open: true, defaultType: "aporte", transaction: null })
              }
            >
              <ArrowDownCircle /> Novo aporte
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setTransactionDialog({ open: true, defaultType: "resgate", transaction: null })
              }
            >
              <ArrowUpCircle /> Novo resgate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma transação registrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.transaction_date)}</TableCell>
                    <TableCell>
                      {TRANSACTION_TYPE_LABELS[t.type as InvestmentTransactionType] ?? t.type}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(t.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          onClick={() =>
                            setTransactionDialog({
                              open: true,
                              defaultType: t.type as InvestmentTransactionType,
                              transaction: t,
                            })
                          }
                          aria-label="Editar"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          onClick={() => handleDeleteTransaction(t)}
                          aria-label="Excluir"
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InvestmentFormDialog open={editOpen} onOpenChange={setEditOpen} investment={investment} />

      <InvestmentTransactionFormDialog
        open={transactionDialog.open}
        onOpenChange={(open) => setTransactionDialog((s) => ({ ...s, open }))}
        investmentId={investment.id}
        defaultType={transactionDialog.defaultType}
        transaction={transactionDialog.transaction}
      />

      {!isRendaFixa && (
        <InvestmentValuationFormDialog
          open={valuationDialog.open}
          onOpenChange={(open) => setValuationDialog((s) => ({ ...s, open }))}
          investmentId={investment.id}
          valuation={valuationDialog.valuation}
        />
      )}

      <RecurringInvestmentContributionFormDialog
        open={recurringDialog.open}
        onOpenChange={(open) => setRecurringDialog((s) => ({ ...s, open }))}
        investmentId={investment.id}
        recurringContribution={recurringDialog.recurringContribution}
      />
    </div>
  );
}
