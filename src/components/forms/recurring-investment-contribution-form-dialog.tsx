"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  recurringInvestmentContributionSchema,
  type RecurringInvestmentContributionInput,
} from "@/lib/validations/recurring-investment-contributions";
import {
  createRecurringInvestmentContribution,
  updateRecurringInvestmentContribution,
} from "@/actions/recurring-investment-contributions";
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
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/forms/date-picker";
import type { Tables } from "@/types/database.types";

type RecurringInvestmentContribution = Tables<"recurring_investment_contributions">;

function emptyDefaults(investmentId: string): RecurringInvestmentContributionInput {
  return {
    investmentId,
    amount: 0,
    dayOfMonth: 5,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: null,
    isActive: true,
  };
}

export function RecurringInvestmentContributionFormDialog({
  open,
  onOpenChange,
  investmentId,
  recurringContribution,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId: string;
  recurringContribution?: RecurringInvestmentContribution | null;
}) {
  const isEdit = !!recurringContribution;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecurringInvestmentContributionInput>({
    resolver: zodResolver(recurringInvestmentContributionSchema),
    defaultValues: emptyDefaults(investmentId),
  });

  useEffect(() => {
    if (open) {
      reset(
        recurringContribution
          ? {
              investmentId: recurringContribution.investment_id,
              amount: recurringContribution.amount,
              dayOfMonth: recurringContribution.day_of_month,
              startDate: recurringContribution.start_date,
              endDate: recurringContribution.end_date,
              isActive: recurringContribution.is_active,
            }
          : emptyDefaults(investmentId)
      );
    }
  }, [open, recurringContribution, investmentId, reset]);

  function onSubmit(data: RecurringInvestmentContributionInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateRecurringInvestmentContribution(recurringContribution.id, data)
        : await createRecurringInvestmentContribution(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Aporte recorrente atualizado" : "Aporte recorrente criado");
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
          <DialogTitle>
            {isEdit ? "Editar aporte recorrente" : "Novo aporte recorrente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
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
              <Label htmlFor="dayOfMonth">Dia do mês</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min={1}
                max={31}
                {...register("dayOfMonth", { valueAsNumber: true })}
              />
              {errors.dayOfMonth && (
                <p className="text-sm text-destructive">{errors.dayOfMonth.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Início</Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fim (opcional)</Label>
              <Controller
                control={control}
                name="endDate"
                render={({ field }) => (
                  <DatePicker value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label htmlFor="isActive">Ativo</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
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
