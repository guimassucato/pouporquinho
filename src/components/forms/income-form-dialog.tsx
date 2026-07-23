"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { incomeSchema, type IncomeInput } from "@/lib/validations/incomes";
import { createIncome, updateIncome } from "@/actions/incomes";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/forms/date-picker";
import type { Tables } from "@/types/database.types";

type Income = Tables<"incomes">;
type Category = Tables<"categories">;

const NONE = "__none__";

function emptyDefaults(): IncomeInput {
  return {
    categoryId: null,
    amount: 0,
    description: "",
    incomeDate: format(new Date(), "yyyy-MM-dd"),
  };
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  income,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: Income | null;
  categories: Category[];
}) {
  const isEdit = !!income;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: emptyDefaults(),
  });

  useEffect(() => {
    if (open) {
      reset(
        income
          ? {
              categoryId: income.category_id,
              amount: income.amount,
              description: income.description,
              incomeDate: income.income_date,
            }
          : emptyDefaults()
      );
    }
  }, [open, income, reset]);

  function onSubmit(data: IncomeInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateIncome(income.id, data)
        : await createIncome(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Receita atualizada" : "Receita lançada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar receita" : "Nova receita"}</DialogTitle>
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
                name="incomeDate"
                render={({ field }) => (
                  <DatePicker value={field.value} onChange={field.onChange} />
                )}
              />
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
                    <SelectValue placeholder="Selecione" />
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
