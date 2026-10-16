import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { budgetSchema } from "@/lib/validations/budgets";
import { ensureRecurringExpensesForMonth } from "@/lib/finance/recurring";
import { ensureRecurringIncomesForMonth } from "@/lib/finance/income-recurring";
import { ensureRecurringInvestmentContributionsForMonth } from "@/lib/finance/investment-recurring";
import {
  type McpContext,
  ToolError,
  assertNoDbError,
  monthArg,
  monthStart,
  resolveCategory,
  revalidate,
  round2,
  tool,
  validate,
} from "../context";

async function budgetStatus(ctx: McpContext, month: string) {
  const [{ data: budgets, error: budgetsError }, { data: spentRows, error: spentError }] =
    await Promise.all([
      ctx.db
        .from("budgets")
        .select("id, amount_limit, category_id, categories(name)")
        .eq("user_id", ctx.userId)
        .eq("month", month),
      ctx.db
        .from("expenses_by_category_month")
        .select("category_id, total")
        .eq("user_id", ctx.userId)
        .eq("month", month),
    ]);
  assertNoDbError(budgetsError ?? spentError);

  const spentByCategory = new Map(
    (spentRows ?? []).map((r) => [r.category_id, r.total ?? 0])
  );

  return (budgets ?? []).map((b) => {
    const spent = spentByCategory.get(b.category_id) ?? 0;
    return {
      id: b.id,
      category: b.categories?.name,
      limit: b.amount_limit,
      spent: round2(spent),
      remaining: round2(b.amount_limit - spent),
      percentUsed: Math.round((spent / b.amount_limit) * 100),
    };
  });
}

export function registerSummaryTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "get_monthly_summary",
    {
      title: "Resumo do mês",
      description:
        "Visão geral financeira de um mês: total de receitas, despesas, saldo, gastos por categoria e por forma de pagamento, e situação dos orçamentos. Use para perguntas como \"como estou esse mês?\" ou \"quanto gastei em outubro?\".",
      inputSchema: { month: monthArg.optional() },
      annotations: { readOnlyHint: true },
    },
    tool(async (args) => {
      const month = monthStart(args.month);
      // Same as opening /dashboard: materialize recurring entries for the month first.
      await ensureRecurringExpensesForMonth(ctx.db, ctx.userId, month);
      await ensureRecurringIncomesForMonth(ctx.db, ctx.userId, month);
      await ensureRecurringInvestmentContributionsForMonth(ctx.db, ctx.userId, month);

      const [cashflow, byCategory, byPaymentMethod, categories, paymentMethods, budgets] =
        await Promise.all([
          ctx.db
            .from("monthly_cashflow")
            .select("income_total, expense_total")
            .eq("user_id", ctx.userId)
            .eq("month", month)
            .maybeSingle(),
          ctx.db
            .from("expenses_by_category_month")
            .select("category_id, total")
            .eq("user_id", ctx.userId)
            .eq("month", month),
          ctx.db
            .from("expenses_by_payment_method_month")
            .select("payment_method_id, total")
            .eq("user_id", ctx.userId)
            .eq("month", month),
          ctx.db.from("categories").select("id, name").eq("user_id", ctx.userId),
          ctx.db.from("payment_methods").select("id, name").eq("user_id", ctx.userId),
          budgetStatus(ctx, month),
        ]);
      for (const result of [cashflow, byCategory, byPaymentMethod, categories, paymentMethods]) {
        assertNoDbError(result.error);
      }

      const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
      const paymentMethodName = new Map((paymentMethods.data ?? []).map((p) => [p.id, p.name]));
      const income = cashflow.data?.income_total ?? 0;
      const expense = cashflow.data?.expense_total ?? 0;

      return {
        month: month.slice(0, 7),
        income: round2(income),
        expense: round2(expense),
        balance: round2(income - expense),
        expensesByCategory: (byCategory.data ?? [])
          .map((r) => ({
            category: categoryName.get(r.category_id ?? "") ?? "Sem categoria",
            total: round2(r.total ?? 0),
          }))
          .sort((a, b) => b.total - a.total),
        expensesByPaymentMethod: (byPaymentMethod.data ?? [])
          .map((r) => ({
            paymentMethod: paymentMethodName.get(r.payment_method_id ?? "") ?? "—",
            total: round2(r.total ?? 0),
          }))
          .sort((a, b) => b.total - a.total),
        budgets,
      };
    })
  );

  server.registerTool(
    "list_budgets",
    {
      title: "Listar orçamentos",
      description:
        "Lista os orçamentos (limites de gasto por categoria) de um mês, com quanto já foi gasto e quanto resta.",
      inputSchema: { month: monthArg.optional() },
      annotations: { readOnlyHint: true },
    },
    tool(async (args) => {
      const month = monthStart(args.month);
      await ensureRecurringExpensesForMonth(ctx.db, ctx.userId, month);
      return { month: month.slice(0, 7), budgets: await budgetStatus(ctx, month) };
    })
  );

  server.registerTool(
    "set_budget",
    {
      title: "Definir orçamento",
      description:
        "Define o limite de gasto de uma categoria de despesa em um mês. Se já existir orçamento para a categoria no mês, o limite é atualizado.",
      inputSchema: {
        category: z.string().describe("Nome ou id da categoria de despesa"),
        amountLimit: z.number().positive().describe("Limite em reais"),
        month: monthArg.optional(),
      },
    },
    tool(async (args) => {
      const category = await resolveCategory(ctx, args.category, "expense");
      const data = validate(budgetSchema, {
        categoryId: category.id,
        month: monthStart(args.month),
        amountLimit: args.amountLimit,
      });

      const { data: row, error } = await ctx.db
        .from("budgets")
        .upsert(
          {
            user_id: ctx.userId,
            category_id: data.categoryId,
            month: data.month,
            amount_limit: data.amountLimit,
          },
          { onConflict: "user_id,category_id,month" }
        )
        .select("id, month, amount_limit")
        .single();
      assertNoDbError(error);

      revalidate("/budgets", "/dashboard");
      return { budget: { ...row, category: category.name } };
    })
  );

  server.registerTool(
    "delete_budget",
    {
      title: "Remover orçamento",
      description: "Remove o orçamento de uma categoria em um mês.",
      inputSchema: {
        category: z.string().describe("Nome ou id da categoria de despesa"),
        month: monthArg.optional(),
      },
      annotations: { destructiveHint: true },
    },
    tool(async (args) => {
      const category = await resolveCategory(ctx, args.category, "expense");
      const month = monthStart(args.month);

      const { data, error } = await ctx.db
        .from("budgets")
        .delete()
        .eq("user_id", ctx.userId)
        .eq("category_id", category.id)
        .eq("month", month)
        .select("id");
      assertNoDbError(error);
      if (!data?.length) {
        throw new ToolError(`Não há orçamento para "${category.name}" em ${month.slice(0, 7)}.`);
      }

      revalidate("/budgets", "/dashboard");
      return { deleted: { category: category.name, month: month.slice(0, 7) } };
    })
  );
}
