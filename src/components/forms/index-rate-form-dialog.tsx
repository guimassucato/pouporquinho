"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { indexRateSchema, type IndexRateInput } from "@/lib/validations/index-rates";
import { createIndexRate, updateIndexRate } from "@/actions/index-rates";
import { INDEXADOR_LABELS } from "@/lib/finance/investment-labels";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/forms/date-picker";
import type { Tables } from "@/types/database.types";

type IndexRate = Tables<"index_rates">;

function emptyDefaults(): IndexRateInput {
  return {
    indexador: "cdi",
    annualRatePercent: 0,
    effectiveFrom: format(new Date(), "yyyy-MM-dd"),
  };
}

export function IndexRateFormDialog({
  open,
  onOpenChange,
  indexRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indexRate?: IndexRate | null;
}) {
  const isEdit = !!indexRate;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<IndexRateInput>({
    resolver: zodResolver(indexRateSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      reset(
        indexRate
          ? {
              indexador: indexRate.indexador as IndexRateInput["indexador"],
              annualRatePercent: indexRate.annual_rate_percent,
              effectiveFrom: indexRate.effective_from,
            }
          : emptyDefaults()
      );
    }
  }, [open, indexRate, reset]);

  function onSubmit(data: IndexRateInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateIndexRate(indexRate.id, data)
        : await createIndexRate(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Taxa atualizada" : "Taxa cadastrada");
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
          <DialogTitle>{isEdit ? "Editar taxa" : "Nova taxa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Indexador</Label>
            <Controller
              control={control}
              name="indexador"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: IndexRateInput["indexador"]) => INDEXADOR_LABELS[value]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(["cdi", "selic", "ipca"] as const).map((value) => (
                      <SelectItem key={value} value={value}>
                        {INDEXADOR_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="annualRatePercent">Taxa anual (%)</Label>
              <Input
                id="annualRatePercent"
                type="number"
                step="0.01"
                min={0}
                {...register("annualRatePercent", { valueAsNumber: true })}
              />
              {errors.annualRatePercent && (
                <p className="text-sm text-destructive">{errors.annualRatePercent.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Vigente a partir de</Label>
              <Controller
                control={control}
                name="effectiveFrom"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
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
