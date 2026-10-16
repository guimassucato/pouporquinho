import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { investmentTransactionSchema } from "@/lib/validations/investment-transactions";
import { investmentValuationSchema } from "@/lib/validations/investment-valuations";
import { computePortfolioSummary } from "@/lib/finance/investment-portfolio";
import { ensureRecurringInvestmentContributionsForMonth } from "@/lib/finance/investment-recurring";
import {
  type McpContext,
  ToolError,
  assertNoDbError,
  dateArg,
  monthStart,
  resolveInvestment,
  revalidate,
  round2,
  today,
  tool,
  validate,
} from "../context";

export function registerInvestmentTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_investments",
    {
      title: "Listar investimentos",
      description:
        "Lista os investimentos com valor atual, valor aplicado (custo) e rendimento acumulado, além do total da carteira e da distribuição por tipo.",
      inputSchema: { includeArchived: z.boolean().default(false) },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ includeArchived }) => {
      const asOfDate = today();
      // Same as opening /investments: materialize this month's scheduled contributions.
      await ensureRecurringInvestmentContributionsForMonth(ctx.db, ctx.userId, monthStart());

      let investmentsQuery = ctx.db
        .from("investments")
        .select("*")
        .eq("user_id", ctx.userId)
        .order("name");
      if (!includeArchived) investmentsQuery = investmentsQuery.eq("is_archived", false);

      const [investments, transactions, valuations, indexRates] = await Promise.all([
        investmentsQuery,
        ctx.db.from("investment_transactions").select("*").eq("user_id", ctx.userId),
        ctx.db.from("investment_valuations").select("*").eq("user_id", ctx.userId),
        ctx.db.from("index_rates").select("*").eq("user_id", ctx.userId),
      ]);
      for (const result of [investments, transactions, valuations, indexRates]) {
        assertNoDbError(result.error);
      }

      const summary = computePortfolioSummary(
        investments.data ?? [],
        transactions.data ?? [],
        valuations.data ?? [],
        indexRates.data ?? [],
        asOfDate
      );

      return {
        asOfDate,
        totalCurrentValue: round2(summary.totalInvested),
        byType: Object.fromEntries(
          [...summary.byType].map(([type, value]) => [type, round2(value)])
        ),
        investments: (investments.data ?? []).map((inv) => {
          const values = summary.perInvestment.get(inv.id);
          return {
            id: inv.id,
            name: inv.name,
            type: inv.type,
            indexador: inv.indexador,
            ratePercent: inv.rate_percent,
            institution: inv.institution,
            ticker: inv.ticker,
            isArchived: inv.is_archived,
            currentValue: round2(values?.currentValue ?? 0),
            costBasis: round2(values?.costBasis ?? 0),
            accruedYield: round2(values?.accruedYield ?? 0),
          };
        }),
      };
    })
  );

  server.registerTool(
    "add_investment_transaction",
    {
      title: "Registrar movimentação de investimento",
      description:
        "Registra um aporte, resgate ou rendimento em um investimento existente. Tipos: aporte (dinheiro aplicado), resgate (dinheiro retirado), rendimento_reinvestido (rendimento que ficou aplicado), rendimento_sacado (rendimento pago para fora).",
      inputSchema: {
        investment: z.string().describe("Nome ou id do investimento"),
        type: z.enum(["aporte", "resgate", "rendimento_reinvestido", "rendimento_sacado"]),
        amount: z.number().positive(),
        date: dateArg.optional().describe("Padrão: hoje"),
        notes: z.string().optional(),
      },
    },
    tool(async (args) => {
      const investment = await resolveInvestment(ctx, args.investment);
      const data = validate(investmentTransactionSchema, {
        investmentId: investment.id,
        type: args.type,
        amount: args.amount,
        transactionDate: args.date ?? today(),
        notes: args.notes ?? null,
      });

      const { data: row, error } = await ctx.db
        .from("investment_transactions")
        .insert({
          user_id: ctx.userId,
          investment_id: data.investmentId,
          type: data.type,
          amount: data.amount,
          transaction_date: data.transactionDate,
          notes: data.notes || null,
        })
        .select("id, type, amount, transaction_date, notes")
        .single();
      assertNoDbError(error);

      revalidate("/investments", `/investments/${investment.id}`, "/dashboard");
      return { created: { ...row, investment: investment.name } };
    })
  );

  server.registerTool(
    "set_investment_valuation",
    {
      title: "Atualizar saldo de investimento",
      description:
        "Informa o valor total atual de um investimento de renda variável, fundo, cripto ou previdência (marcação a mercado). Não se aplica a renda fixa, cujo valor é calculado automaticamente. Se já houver avaliação na mesma data, ela é substituída.",
      inputSchema: {
        investment: z.string().describe("Nome ou id do investimento"),
        totalValue: z.number().min(0).describe("Valor total da posição em reais"),
        date: dateArg.optional().describe("Padrão: hoje"),
        notes: z.string().optional(),
      },
    },
    tool(async (args) => {
      const investment = await resolveInvestment(ctx, args.investment);
      if (investment.type === "renda_fixa") {
        throw new ToolError(
          `"${investment.name}" é renda fixa: o valor é calculado automaticamente e não aceita avaliação manual.`
        );
      }
      const data = validate(investmentValuationSchema, {
        investmentId: investment.id,
        valuationDate: args.date ?? today(),
        totalValue: args.totalValue,
        notes: args.notes ?? null,
      });

      const { data: row, error } = await ctx.db
        .from("investment_valuations")
        .upsert(
          {
            user_id: ctx.userId,
            investment_id: data.investmentId,
            valuation_date: data.valuationDate,
            total_value: data.totalValue,
            notes: data.notes || null,
          },
          { onConflict: "investment_id,valuation_date" }
        )
        .select("id, valuation_date, total_value, notes")
        .single();
      assertNoDbError(error);

      revalidate("/investments", `/investments/${investment.id}`, "/dashboard");
      return { valuation: { ...row, investment: investment.name } };
    })
  );
}
