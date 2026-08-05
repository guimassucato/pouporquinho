"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { DatePicker } from "@/components/forms/date-picker";
import {
  parseStatementPdf,
  importTransactions,
  type ParsedTransactionRow,
} from "@/actions/statement-import";
import { formatCurrency, formatMonth } from "@/lib/finance/format";
import type { Tables } from "@/types/database.types";

type Category = Tables<"categories">;
type PaymentMethod = Tables<"payment_methods">;

type ReviewRow = {
  id: string;
  include: boolean;
  date: string;
  description: string;
  amount: number;
  categoryId: string;
};

function monthOptions(count: number): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1));
    const value = date.toISOString().slice(0, 10);
    options.push({ value, label: formatMonth(value) });
  }
  return options;
}

export function ImportClient({
  categories,
  paymentMethods,
}: {
  categories: Category[];
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [referenceMonth, setReferenceMonth] = useState(monthOptions(1)[0].value);
  const [fileError, setFileError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");

  const months = useMemo(() => monthOptions(24), []);
  const defaultCategoryId = categories[0]?.id ?? "";

  function handleUpload(formData: FormData) {
    setFileError(null);
    if (!paymentMethodId) {
      setFileError("Cadastre um cartão de crédito antes de importar uma fatura");
      return;
    }
    formData.set("referenceMonth", referenceMonth);
    if (password) {
      formData.set("password", password);
    }

    startTransition(async () => {
      const result = await parseStatementPdf(formData);
      if ("error" in result) {
        setFileError(result.error);
        setNeedsPassword(Boolean(result.needsPassword));
        return;
      }

      setNeedsPassword(false);
      setRows(
        result.transactions.map((t: ParsedTransactionRow) => ({
          id: t.id,
          include: !t.isLikelyPayment,
          date: t.date,
          description: t.description,
          amount: t.amount,
          categoryId: defaultCategoryId,
        }))
      );
      toast.success(`${result.transactions.length} lançamentos encontrados`);
    });
  }

  function updateRow(id: string, patch: Partial<ReviewRow>) {
    setRows((current) =>
      current ? current.map((r) => (r.id === id ? { ...r, ...patch } : r)) : current
    );
  }

  function removeRow(id: string) {
    setRows((current) => (current ? current.filter((r) => r.id !== id) : current));
  }

  const includedRows = rows?.filter((r) => r.include) ?? [];
  const total = includedRows.reduce((sum, r) => sum + r.amount, 0);

  function handleConfirm() {
    if (includedRows.length === 0) {
      toast.error("Selecione ao menos um lançamento");
      return;
    }
    if (includedRows.some((r) => !r.categoryId)) {
      toast.error("Escolha uma categoria para todos os lançamentos selecionados");
      return;
    }

    startTransition(async () => {
      const result = await importTransactions({
        paymentMethodId,
        transactions: includedRows.map((r) => ({
          categoryId: r.categoryId,
          amount: r.amount,
          description: r.description,
          expenseDate: r.date,
        })),
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(`${includedRows.length} despesas lançadas`);
      router.push("/expenses");
    });
  }

  if (!rows) {
    return (
      <div>
        <PageHeader
          title="Importar fatura"
          description="Envie o PDF da fatura do cartão para lançar as despesas automaticamente"
        />

        <form
          action={handleUpload}
          className="flex max-w-md flex-col gap-4 rounded-xl border bg-card p-6"
        >
          <div className="flex flex-col gap-2">
            <Label>Cartão de crédito</Label>
            <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione">
                  {(value: string) =>
                    paymentMethods.find((p) => p.id === value)?.name ?? "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paymentMethods.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum cartão de crédito cadastrado ainda.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Mês de referência da fatura</Label>
            <Select value={referenceMonth} onValueChange={(v) => setReferenceMonth(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione">
                  {(value: string) =>
                    months.find((m) => m.value === value)?.label ?? "Selecione"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Arquivo PDF</Label>
            <Input id="file" name="file" type="file" accept="application/pdf" required />
          </div>

          {needsPassword && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha do PDF</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha da fatura"
                autoFocus
              />
            </div>
          )}

          {fileError && <p className="text-sm text-destructive">{fileError}</p>}

          <Button type="submit" disabled={isPending || paymentMethods.length === 0}>
            <FileUp /> {isPending ? "Lendo PDF..." : "Analisar PDF"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Revisar lançamentos"
        description="Confira, ajuste ou remova os lançamentos antes de confirmar a importação"
        actions={
          <Button variant="ghost" onClick={() => setRows(null)}>
            <ArrowLeft /> Voltar
          </Button>
        }
      />

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Incluir</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={!row.include ? "opacity-50" : undefined}>
                <TableCell>
                  <Switch
                    checked={row.include}
                    onCheckedChange={(checked) => updateRow(row.id, { include: checked })}
                  />
                </TableCell>
                <TableCell>
                  <DatePicker
                    value={row.date}
                    onChange={(date) => updateRow(row.id, { date })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.categoryId}
                    onValueChange={(v) => updateRow(row.id, { categoryId: v ?? "" })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione">
                        {(value: string) =>
                          categories.find((c) => c.id === value)?.name ?? "Selecione"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    className="text-right"
                    value={row.amount}
                    onChange={(e) =>
                      updateRow(row.id, { amount: Number(e.target.value) || 0 })
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remover"
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>
                {includedRows.length} de {rows.length} selecionados
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleConfirm} disabled={isPending}>
          {isPending
            ? "Lançando..."
            : `Confirmar e lançar (${includedRows.length})`}
        </Button>
      </div>
    </div>
  );
}
