"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Archive, ArchiveRestore, Plus } from "lucide-react";
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
import { PageHeader } from "@/components/layout/page-header";
import { PaymentMethodFormDialog } from "@/components/forms/payment-method-form-dialog";
import {
  deletePaymentMethod,
  setPaymentMethodArchived,
} from "@/actions/payment-methods";
import { getPaymentMethodIcon } from "@/lib/finance/icons";
import type { Tables } from "@/types/database.types";

type PaymentMethod = Tables<"payment_methods">;

const KIND_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  pix: "Pix",
  other: "Outro",
};

export function PaymentMethodsClient({
  paymentMethods,
}: {
  paymentMethods: PaymentMethod[];
}) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    paymentMethod: PaymentMethod | null;
  }>({ open: false, paymentMethod: null });
  const [isPending, startTransition] = useTransition();

  function handleDelete(pm: PaymentMethod) {
    if (!confirm(`Excluir "${pm.name}"?`)) return;
    startTransition(async () => {
      const result = await deletePaymentMethod(pm.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Forma de pagamento excluída");
    });
  }

  function handleToggleArchive(pm: PaymentMethod) {
    startTransition(async () => {
      const result = await setPaymentMethodArchived(pm.id, !pm.is_archived);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(pm.is_archived ? "Reativada" : "Arquivada");
    });
  }

  return (
    <div>
      <PageHeader
        title="Formas de pagamento"
        description="Cartões, contas e configuração de fatura"
        actions={
          <Button
            onClick={() => setDialogState({ open: true, paymentMethod: null })}
          >
            <Plus /> Nova forma de pagamento
          </Button>
        }
      />

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Forma de pagamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fatura</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhuma forma de pagamento cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {paymentMethods.map((pm) => {
              const Icon = getPaymentMethodIcon(pm.icon);
              return (
                <TableRow key={pm.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="flex size-7 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: pm.color }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {pm.name}
                    </div>
                  </TableCell>
                  <TableCell>{KIND_LABELS[pm.kind] ?? pm.kind}</TableCell>
                  <TableCell>
                    {pm.kind === "credit" && pm.closing_day && pm.due_day ? (
                      <span className="text-sm text-muted-foreground">
                        Fecha dia {pm.closing_day}, vence dia {pm.due_day}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {pm.is_archived ? (
                      <Badge variant="secondary">Arquivada</Badge>
                    ) : (
                      <Badge variant="outline">Ativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() =>
                          setDialogState({ open: true, paymentMethod: pm })
                        }
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleToggleArchive(pm)}
                        aria-label={pm.is_archived ? "Reativar" : "Arquivar"}
                      >
                        {pm.is_archived ? <ArchiveRestore /> : <Archive />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(pm)}
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

      <PaymentMethodFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        paymentMethod={dialogState.paymentMethod}
      />
    </div>
  );
}
