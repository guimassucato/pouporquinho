"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  recurringIncomeSchema,
  type RecurringIncomeInput,
} from "@/lib/validations/recurring-incomes";
import {
  createRecurringIncome,
  updateRecurringIncome,
} from "@/actions/recurring-incomes";
import { getCategoryIcon } from "@/lib/finance/icons";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/forms/date-picker";
import type { Tables } from "@/types/database.types";

type RecurringIncome = Tables<"recurring_incomes">;
type Category = Tables<"categories">;

const NONE = "__none__";

function emptyDefaults(): RecurringIncomeInput {
  return {
    categoryId: null,
    amount: 0,
    description: "",
    dayOfMonth: 1,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: null,
    isActive: true,
  };
}

export function RecurringIncomeFormDialog({
  open,
  onOpenChange,
  recurringIncome,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringIncome?: RecurringIncome | null;
  categories: Category[];
}) {
  const isEdit = !!recurringIncome;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecurringIncomeInput>({
    resolver: zodResolver(recurringIncomeSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      reset(
        recurringIncome
          ? {
              categoryId: recurringIncome.category_id,
              amount: recurringIncome.amount,
              description: recurringIncome.description,
              dayOfMonth: recurringIncome.day_of_month,
              startDate: recurringIncome.start_date,
              endDate: recurringIncome.end_date,
              isActive: recurringIncome.is_active,
            }
          : emptyDefaults()
      );
    }
  }, [open, recurringIncome, reset]);

  function onSubmit(data: RecurringIncomeInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateRecurringIncome(recurringIncome.id, data)
        : await createRecurringIncome(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Recorrência atualizada" : "Recorrência criada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar receita recorrente" : "Nova receita recorrente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Aluguel recebido..."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
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

          <div className="flex flex-col gap-2">
            <Label>Categoria (opcional)</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione">
                      {(value: string) => {
                        if (value === NONE || !value) return "Sem categoria";
                        const category = categories.find((c) => c.id === value);
                        if (!category) return "Selecione";
                        const Icon = getCategoryIcon(category.icon);
                        return (
                          <>
                            <Icon className="size-4" style={{ color: category.color }} />
                            {category.name}
                          </>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem categoria</SelectItem>
                    {categories.map((category) => {
                      const Icon = getCategoryIcon(category.icon);
                      return (
                        <SelectItem key={category.id} value={category.id}>
                          <Icon className="size-4" style={{ color: category.color }} />
                          {category.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
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
            <Label htmlFor="isActive">Ativa</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
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
