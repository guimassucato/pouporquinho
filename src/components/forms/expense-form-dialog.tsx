"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expenses";
import { createExpense, updateExpense } from "@/actions/expenses";
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

type Expense = Tables<"expenses">;
type Category = Tables<"categories">;
type PaymentMethod = Tables<"payment_methods">;

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function emptyDefaults(): ExpenseInput {
  return {
    categoryId: "",
    paymentMethodId: "",
    amount: 0,
    description: "",
    expenseDate: todayIso(),
    notes: "",
  };
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  categories,
  paymentMethods,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const isEdit = !!expense;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      reset(
        expense
          ? {
              categoryId: expense.category_id,
              paymentMethodId: expense.payment_method_id,
              amount: expense.amount,
              description: expense.description,
              expenseDate: expense.expense_date,
              notes: expense.notes ?? "",
            }
          : emptyDefaults()
      );
    }
  }, [open, expense, reset]);

  function onSubmit(data: ExpenseInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateExpense(expense.id, data)
        : await createExpense(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Despesa atualizada" : "Despesa lançada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" {...register("description")} />
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
              <Label>Data</Label>
              <Controller
                control={control}
                name="expenseDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
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
                    <SelectValue placeholder="Selecione" />
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
                    <SelectValue placeholder="Selecione" />
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
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
