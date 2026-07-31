"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  investmentTransactionSchema,
  type InvestmentTransactionInput,
} from "@/lib/validations/investment-transactions";
import {
  createInvestmentTransaction,
  updateInvestmentTransaction,
} from "@/actions/investment-transactions";
import { TRANSACTION_TYPE_LABELS } from "@/lib/finance/investment-labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/forms/date-picker";
import type { Tables } from "@/types/database.types";

type InvestmentTransaction = Tables<"investment_transactions">;

function emptyDefaults(
  investmentId: string,
  defaultType: InvestmentTransactionInput["type"]
): InvestmentTransactionInput {
  return {
    investmentId,
    type: defaultType,
    amount: 0,
    transactionDate: format(new Date(), "yyyy-MM-dd"),
    notes: null,
  };
}

export function InvestmentTransactionFormDialog({
  open,
  onOpenChange,
  investmentId,
  defaultType = "aporte",
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId: string;
  defaultType?: InvestmentTransactionInput["type"];
  transaction?: InvestmentTransaction | null;
}) {
  const isEdit = !!transaction;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InvestmentTransactionInput>({
    resolver: zodResolver(investmentTransactionSchema),
    defaultValues: emptyDefaults(investmentId, defaultType),
  });

  useEffect(() => {
    if (open) {
      reset(
        transaction
          ? {
              investmentId: transaction.investment_id,
              type: transaction.type as InvestmentTransactionInput["type"],
              amount: transaction.amount,
              transactionDate: transaction.transaction_date,
              notes: transaction.notes,
            }
          : emptyDefaults(investmentId, defaultType)
      );
    }
  }, [open, transaction, investmentId, defaultType, reset]);

  function onSubmit(data: InvestmentTransactionInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateInvestmentTransaction(transaction.id, data)
        : await createInvestmentTransaction(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Transação atualizada" : "Transação registrada");
      onOpenChange(false);
    });
  }

  function onInvalid(formErrors: typeof errors) {
    const message = Object.values(formErrors)[0]?.message;
    toast.error(message ?? "Verifique os campos do formulário");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar transação" : "Nova transação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: InvestmentTransactionInput["type"]) =>
                        TRANSACTION_TYPE_LABELS[value]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={0}
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Data</Label>
              <Controller
                control={control}
                name="transactionDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              rows={2}
              {...register("notes", { setValueAs: (v) => v || null })}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
