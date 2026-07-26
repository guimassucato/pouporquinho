"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  recurringExpenseSchema,
  type RecurringExpenseInput,
} from "@/lib/validations/recurring-expenses";
import {
  createRecurringExpense,
  updateRecurringExpense,
} from "@/actions/recurring-expenses";
import { getCategoryIcon, getPaymentMethodIcon } from "@/lib/finance/icons";
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

type RecurringExpense = Tables<"recurring_expenses">;
type Category = Tables<"categories">;
type PaymentMethod = Tables<"payment_methods">;

function emptyDefaults(): RecurringExpenseInput {
  return {
    categoryId: "",
    paymentMethodId: "",
    amount: 0,
    description: "",
    dayOfMonth: 1,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: null,
    isActive: true,
  };
}

export function RecurringExpenseFormDialog({
  open,
  onOpenChange,
  recurringExpense,
  categories,
  paymentMethods,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringExpense?: RecurringExpense | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const isEdit = !!recurringExpense;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecurringExpenseInput>({
    resolver: zodResolver(recurringExpenseSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      reset(
        recurringExpense
          ? {
              categoryId: recurringExpense.category_id,
              paymentMethodId: recurringExpense.payment_method_id,
              amount: recurringExpense.amount,
              description: recurringExpense.description,
              dayOfMonth: recurringExpense.day_of_month,
              startDate: recurringExpense.start_date,
              endDate: recurringExpense.end_date,
              isActive: recurringExpense.is_active,
            }
          : emptyDefaults()
      );
    }
  }, [open, recurringExpense, reset]);

  function onSubmit(data: RecurringExpenseInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateRecurringExpense(recurringExpense.id, data)
        : await createRecurringExpense(data);

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
            {isEdit ? "Editar despesa recorrente" : "Nova despesa recorrente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Aluguel, Netflix..."
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
            <Label>Categoria</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione">
                      {(value: string) => {
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
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            <Controller
              control={control}
              name="paymentMethodId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione">
                      {(value: string) => {
                        const pm = paymentMethods.find((p) => p.id === value);
                        if (!pm) return "Selecione";
                        const Icon = getPaymentMethodIcon(pm.icon);
                        return (
                          <>
                            <Icon className="size-4" style={{ color: pm.color }} />
                            {pm.name}
                          </>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => {
                      const Icon = getPaymentMethodIcon(pm.icon);
                      return (
                        <SelectItem key={pm.id} value={pm.id}>
                          <Icon className="size-4" style={{ color: pm.color }} />
                          {pm.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentMethodId && (
              <p className="text-sm text-destructive">{errors.paymentMethodId.message}</p>
            )}
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
