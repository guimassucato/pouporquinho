"use client";

import { useEffect, useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { investmentSchema, type InvestmentInput } from "@/lib/validations/investments";
import { createInvestment, updateInvestment } from "@/actions/investments";
import { INDEXADOR_LABELS, INVESTMENT_TYPE_LABELS, rateLabel } from "@/lib/finance/investment-labels";
import type { Indexador } from "@/lib/finance/investment-yield";
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

type Investment = Tables<"investments">;

const TICKER_TYPES: InvestmentInput["type"][] = ["renda_variavel", "fundo", "cripto"];

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function emptyDefaults(): InvestmentInput {
  return {
    name: "",
    type: "renda_fixa",
    indexador: "cdi",
    ratePercent: null,
    institution: null,
    ticker: null,
    notes: null,
    startDate: format(new Date(), "yyyy-MM-dd"),
  };
}

export function InvestmentFormDialog({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
}) {
  const isEdit = !!investment;
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<InvestmentInput>({
    resolver: zodResolver(investmentSchema),
    defaultValues: emptyDefaults(),
  });

  const type = useWatch({ control, name: "type" });
  const indexador = useWatch({ control, name: "indexador" });

  useEffect(() => {
    if (open) {
      reset(
        investment
          ? {
              name: investment.name,
              type: investment.type as InvestmentInput["type"],
              indexador: investment.indexador as InvestmentInput["indexador"],
              ratePercent: investment.rate_percent,
              institution: investment.institution,
              ticker: investment.ticker,
              notes: investment.notes,
              startDate: investment.start_date,
            }
          : emptyDefaults()
      );
    }
  }, [open, investment, reset]);

  function onSubmit(data: InvestmentInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateInvestment(investment.id, data)
        : await createInvestment(data);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Investimento atualizado" : "Investimento criado");
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
          <DialogTitle>{isEdit ? "Editar investimento" : "Novo investimento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Tesouro Selic 2029, PETR4..."
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: InvestmentInput["type"]) => INVESTMENT_TYPE_LABELS[value]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {type === "renda_fixa" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Indexador</Label>
                <Controller
                  control={control}
                  name="indexador"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: Indexador) => INDEXADOR_LABELS[value]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INDEXADOR_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.indexador && (
                  <p className="text-sm text-destructive">{errors.indexador.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ratePercent">{rateLabel(indexador)}</Label>
                <Input
                  id="ratePercent"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("ratePercent", { setValueAs: toNullableNumber })}
                />
                {errors.ratePercent && (
                  <p className="text-sm text-destructive">{errors.ratePercent.message}</p>
                )}
              </div>
            </div>
          )}

          {TICKER_TYPES.includes(type) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ticker">Ticker (opcional)</Label>
              <Input
                id="ticker"
                placeholder="Ex: PETR4, BTC..."
                {...register("ticker", { setValueAs: (v) => v || null })}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="institution">Instituição (opcional)</Label>
            <Input
              id="institution"
              placeholder="Ex: Nubank, XP, Binance..."
              {...register("institution", { setValueAs: (v) => v || null })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Data de início</Label>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
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
