"use client";

import { useEffect, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { categorySchema, type CategoryInput } from "@/lib/validations/categories";
import { createCategory, updateCategory } from "@/actions/categories";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/finance/icons";
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
import { ColorPicker, IconPicker } from "@/components/forms/color-icon-picker";
import type { Tables } from "@/types/database.types";

type Category = Tables<"categories">;

const emptyDefaults: CategoryInput = {
  name: "",
  kind: "expense",
  color: CATEGORY_COLORS[0],
  icon: "other",
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}) {
  const isEdit = !!category;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? {
              name: category.name,
              kind: category.kind as "expense" | "income",
              color: category.color,
              icon: category.icon,
            }
          : emptyDefaults
      );
    }
  }, [open, category, reset]);

  function onSubmit(data: CategoryInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateCategory(category.id, data)
        : await createCategory(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Categoria atualizada" : "Categoria criada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => (value === "income" ? "Receita" : "Despesa")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="income">Receita</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cor</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Ícone</Label>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <IconPicker
                  value={field.value}
                  onChange={field.onChange}
                  icons={CATEGORY_ICONS}
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
