"use client";

import { useEffect, useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  paymentMethodSchema,
  type PaymentMethodInput,
} from "@/lib/validations/payment-methods";
import {
  createPaymentMethod,
  updatePaymentMethod,
} from "@/actions/payment-methods";
import { PAYMENT_METHOD_ICONS, CATEGORY_COLORS } from "@/lib/finance/icons";
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

type PaymentMethod = Tables<"payment_methods">;

const KIND_LABELS: Record<PaymentMethodInput["kind"], string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Cartão de crédito",
  pix: "Pix",
  other: "Outro",
};

function toNullableNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

const emptyDefaults: PaymentMethodInput = {
  name: "",
  kind: "credit",
  color: CATEGORY_COLORS[9],
  icon: "credit-card",
  closingDay: null,
  dueDay: null,
  creditLimit: null,
};

export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  paymentMethod,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod | null;
}) {
  const isEdit = !!paymentMethod;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: emptyDefaults,
  });

  const kind = useWatch({ control, name: "kind" });

  useEffect(() => {
    if (open) {
      reset(
        paymentMethod
          ? {
              name: paymentMethod.name,
              kind: paymentMethod.kind as PaymentMethodInput["kind"],
              color: paymentMethod.color,
              icon: paymentMethod.icon,
              closingDay: paymentMethod.closing_day,
              dueDay: paymentMethod.due_day,
              creditLimit: paymentMethod.credit_limit,
            }
          : emptyDefaults
      );
    }
  }, [open, paymentMethod, reset]);

  function onSubmit(data: PaymentMethodInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updatePaymentMethod(paymentMethod.id, data)
        : await createPaymentMethod(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Forma de pagamento atualizada" : "Forma de pagamento criada");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar forma de pagamento" : "Nova forma de pagamento"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex: Nubank, Carteira..." {...register("name")} />
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {kind === "credit" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="closingDay">Dia de fechamento</Label>
                <Input
                  id="closingDay"
                  type="number"
                  min={1}
                  max={31}
                  {...register("closingDay", { setValueAs: toNullableNumber })}
                />
                {errors.closingDay && (
                  <p className="text-sm text-destructive">{errors.closingDay.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dueDay">Dia de vencimento</Label>
                <Input
                  id="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  {...register("dueDay", { setValueAs: toNullableNumber })}
                />
                {errors.dueDay && (
                  <p className="text-sm text-destructive">{errors.dueDay.message}</p>
                )}
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="creditLimit">Limite (opcional)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("creditLimit", { setValueAs: toNullableNumber })}
                />
              </div>
            </div>
          )}

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
                  icons={PAYMENT_METHOD_ICONS}
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
