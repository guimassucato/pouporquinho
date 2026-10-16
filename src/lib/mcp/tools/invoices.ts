import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getInvoiceMonth, getInvoicePeriod } from "@/lib/finance/invoice";
import { ensureRecurringExpensesForMonth } from "@/lib/finance/recurring";
import {
  type McpContext,
  ToolError,
  assertNoDbError,
  monthArg,
  monthStart,
  resolvePaymentMethod,
  round2,
  today,
  tool,
} from "../context";

type Card = {
  id: string;
  name: string;
  closing_day: number | null;
  due_day: number | null;
  credit_limit: number | null;
};

async function invoiceFor(
  ctx: McpContext,
  card: Card,
  requestedMonth: string | undefined,
  includeItems: boolean
) {
  const closingDay = card.closing_day!;
  const dueDay = card.due_day!;
  const todayIso = today();

  // Default: the invoice a purchase made today would land on (the open one).
  const closingMonth = requestedMonth
    ? monthStart(requestedMonth)
    : getInvoiceMonth(new Date(`${todayIso}T00:00:00Z`), closingDay, dueDay)
        .closingMonth.toISOString()
        .slice(0, 10);
  const period = getInvoicePeriod(closingMonth, closingDay, dueDay);

  // Recurring card charges only exist once materialized. Mirror what opening
  // /expenses does, but never generate months after the current one.
  const currentMonth = monthStart(todayIso);
  for (const month of new Set([monthStart(period.start), monthStart(period.closingDate)])) {
    if (month <= currentMonth) await ensureRecurringExpensesForMonth(ctx.db, ctx.userId, month);
  }

  const { data, error } = await ctx.db
    .from("expenses")
    .select("id, amount, description, expense_date, notes, recurring_expense_id, categories(name)")
    .eq("user_id", ctx.userId)
    .eq("payment_method_id", card.id)
    .gte("expense_date", period.start)
    .lte("expense_date", period.closingDate)
    .order("expense_date");
  assertNoDbError(error);

  const items = data ?? [];
  const total = round2(items.reduce((sum, e) => sum + e.amount, 0));

  return {
    card: card.name,
    invoiceMonth: closingMonth.slice(0, 7),
    status: todayIso <= period.closingDate ? "aberta" : "fechada",
    periodStart: period.start,
    closingDate: period.closingDate,
    dueDate: period.dueDate,
    total,
    count: items.length,
    creditLimit: card.credit_limit,
    ...(includeItems && { items }),
  };
}

export function registerInvoiceTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "get_credit_card_invoice",
    {
      title: "Consultar fatura do cartão",
      description:
        "Consulta a fatura de cartão de crédito: período de compras, data de fechamento, vencimento, total e (para um cartão específico) os lançamentos. Sem `month`, retorna a fatura aberta atual. Sem `paymentMethod`, retorna o resumo de todos os cartões de crédito. O app não registra pagamento de fatura: status \"fechada\" só significa que o período de compras terminou.",
      inputSchema: {
        paymentMethod: z
          .string()
          .optional()
          .describe("Nome ou id do cartão de crédito. Padrão: todos os cartões"),
        month: monthArg
          .optional()
          .describe("Mês de fechamento da fatura (AAAA-MM). Padrão: fatura aberta atual."),
        includeItems: z
          .boolean()
          .optional()
          .describe("Incluir os lançamentos. Padrão: sim para um cartão, não para todos"),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args) => {
      let query = ctx.db
        .from("payment_methods")
        .select("id, name, closing_day, due_day, credit_limit")
        .eq("user_id", ctx.userId)
        .eq("kind", "credit")
        .order("name");

      if (args.paymentMethod) {
        const method = await resolvePaymentMethod(ctx, args.paymentMethod);
        if (method.kind !== "credit") {
          throw new ToolError(`"${method.name}" não é um cartão de crédito, então não tem fatura.`);
        }
        query = query.eq("id", method.id);
      } else {
        query = query.eq("is_archived", false);
      }

      const { data: cards, error } = await query;
      assertNoDbError(error);
      if (!cards?.length) throw new ToolError("Nenhum cartão de crédito cadastrado.");

      const includeItems = args.includeItems ?? Boolean(args.paymentMethod);
      const invoices = await Promise.all(
        cards.map((card) => invoiceFor(ctx, card, args.month, includeItems))
      );

      return args.paymentMethod
        ? invoices[0]
        : { invoices, total: round2(invoices.reduce((sum, i) => sum + i.total, 0)) };
    })
  );
}
