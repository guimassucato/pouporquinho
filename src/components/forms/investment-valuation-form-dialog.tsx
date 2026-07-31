"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  investmentValuationSchema,
  type InvestmentValuationInput,
} from "@/lib/validations/investment-valuations";
import {
  createInvestmentValuation,
  updateInvestmentValuation,
} from "@/actions/investment-valuations";
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
import { DatePicker } from "@/components/forms/date-picker";
import type { Tables } from "@/types/database.types";

type InvestmentValuation = Tables<"investment_valuations">;

function emptyDefaults(investmentId: string): InvestmentValuationInput {
  return {
    investmentId,
    valuationDate: format(new Date(), "yyyy-MM-dd"),
    totalValue: 0,
    notes: null,
  };
}

export function InvestmentValuationFormDialog({
  open,
  onOpenChange,
  investmentId,
  valuation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId: string;
  valuation?: InvestmentValuation | null;
}) {
  const isEdit = !!valuation;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InvestmentValuationInput>({
    resolver: zodResolver(investmentValuationSchema),
    defaultValues: emptyDefaults(investmentId),
  });

  useEffect(() => {
    if (open) {
      reset(
        valuation
          ? {
              investmentId: valuation.investment_id,
              valuationDate: valuation.valuation_date,
              totalValue: valuation.total_value,
              notes: valuation.notes,
            }
          : emptyDefaults(investmentId)
      );
    }
  }, [open, valuation, investmentId, reset]);

  function onSubmit(data: InvestmentValuationInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateInvestmentValuation(valuation.id, data)
        : await createInvestmentValuation(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Avaliação atualizada" : "Avaliação registrada");
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
          <DialogTitle>{isEdit ? "Editar avaliação" : "Nova avaliação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="totalValue">Valor atual</Label>
              <Input
                id="totalValue"
                type="number"
                step="0.01"
                min={0}
                {...register("totalValue", { valueAsNumber: true })}
              />
              {errors.totalValue && (
                <p className="text-sm text-destructive">{errors.totalValue.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Data</Label>
              <Controller
                control={control}
                name="valuationDate"
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
