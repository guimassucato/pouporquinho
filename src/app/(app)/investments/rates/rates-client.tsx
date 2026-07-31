"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { IndexRateFormDialog } from "@/components/forms/index-rate-form-dialog";
import { deleteIndexRate } from "@/actions/index-rates";
import { formatDate } from "@/lib/finance/format";
import { INDEXADOR_LABELS } from "@/lib/finance/investment-labels";
import type { Tables } from "@/types/database.types";

type IndexRate = Tables<"index_rates">;

export function RatesClient({ indexRates }: { indexRates: IndexRate[] }) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    indexRate: IndexRate | null;
  }>({ open: false, indexRate: null });
  const [isPending, startTransition] = useTransition();

  function handleDelete(rate: IndexRate) {
    if (
      !confirm(
        `Excluir a taxa de ${INDEXADOR_LABELS[rate.indexador] ?? rate.indexador} vigente a partir de ${formatDate(rate.effective_from)}?`
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteIndexRate(rate.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Taxa excluída");
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
        title="Taxas de índice"
        description="CDI, Selic e IPCA usados para calcular o rendimento de renda fixa"
        actions={
          <Button onClick={() => setDialogState({ open: true, indexRate: null })}>
            <Plus /> Nova taxa
          </Button>
        }
      />

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indexador</TableHead>
              <TableHead className="text-right">Taxa anual</TableHead>
              <TableHead>Vigente a partir de</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indexRates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhuma taxa cadastrada ainda. Investimentos de renda fixa indexados a
                  CDI/Selic/IPCA precisam de pelo menos uma taxa para calcular o rendimento.
                </TableCell>
              </TableRow>
            )}
            {indexRates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell>{INDEXADOR_LABELS[rate.indexador] ?? rate.indexador}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {rate.annual_rate_percent}%
                </TableCell>
                <TableCell>{formatDate(rate.effective_from)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => setDialogState({ open: true, indexRate: rate })}
                      aria-label="Editar"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => handleDelete(rate)}
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
      </div>

      <IndexRateFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        indexRate={dialogState.indexRate}
      />
    </div>
  );
}
