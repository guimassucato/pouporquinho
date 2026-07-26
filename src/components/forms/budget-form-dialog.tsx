"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { budgetSchema, type BudgetInput } from "@/lib/validations/budgets";
import { createBudget, updateBudget } from "@/actions/budgets";
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
import type { Tables } from "@/types/database.types";

type Budget = Tables<"budgets">;
type Category = Tables<"categories">;

export function BudgetFormDialog({
  open,
  onOpenChange,
  budget,
  categories,
  month,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
  categories: Category[];
  month: string;
}) {
  const isEdit = !!budget;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { categoryId: "", month, amountLimit: 0 },
  });

  useEffect(() => {
    if (open) {
      reset(
        budget
          ? {
              categoryId: budget.category_id,
              month: budget.month,
              amountLimit: budget.amount_limit,
            }
          : { categoryId: "", month, amountLimit: 0 }
      );
    }
  }, [open, budget, month, reset]);

  function onSubmit(data: BudgetInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateBudget(budget.id, data)
        : await createBudget(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Orçamento atualizado" : "Orçamento criado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEdit}
                >
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
            {categories.length === 0 && !isEdit && (
              <p className="text-sm text-muted-foreground">
                Todas as categorias de despesa já têm orçamento neste mês.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amountLimit">Limite mensal</Label>
            <Input
              id="amountLimit"
              type="number"
              step="0.01"
              min={0}
              {...register("amountLimit", { valueAsNumber: true })}
            />
            {errors.amountLimit && (
              <p className="text-sm text-destructive">{errors.amountLimit.message}</p>
            )}
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
