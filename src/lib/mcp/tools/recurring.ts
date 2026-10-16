import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { recurringExpenseSchema } from "@/lib/validations/recurring-expenses";
import { recurringIncomeSchema } from "@/lib/validations/recurring-incomes";
import { recurringInvestmentContributionSchema } from "@/lib/validations/recurring-investment-contributions";
import {
  type McpContext,
  ToolError,
  assertNoDbError,
  dateArg,
  resolveCategory,
  resolveInvestment,
  resolvePaymentMethod,
  revalidate,
  today,
  tool,
  validate,
} from "../context";

const recurringType = z
  .enum(["expense", "income", "investment"])
  .describe("expense = despesa fixa, income = receita fixa, investment = aporte programado");

const scheduleArgs = {
  dayOfMonth: z.number().int().min(1).max(31).describe("Dia do mês em que ocorre"),
  startDate: dateArg.optional().describe("Início (AAAA-MM-DD). Padrão: hoje."),
  endDate: dateArg.optional().describe("Fim opcional (AAAA-MM-DD). Sem fim se omitido."),
};

const PATHS: Record<z.infer<typeof recurringType>, string[]> = {
  expense: ["/recurring", "/expenses", "/dashboard"],
  income: ["/recurring", "/incomes", "/dashboard"],
  investment: ["/investments", "/dashboard"],
};

export function registerRecurringTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_recurring",
    {
      title: "Listar recorrências",
      description:
        "Lista despesas fixas, receitas fixas e aportes programados em investimentos (lançamentos que se repetem todo mês).",
      inputSchema: {
        type: recurringType.optional().describe("Padrão: todos os tipos"),
        onlyActive: z.boolean().default(false),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ type, onlyActive }) => {
      const result: Record<string, unknown> = {};

      if (!type || type === "expense") {
        let query = ctx.db
          .from("recurring_expenses")
          .select(
            "id, description, amount, day_of_month, start_date, end_date, is_active, categories(name), payment_methods(name)"
          )
          .eq("user_id", ctx.userId)
          .order("day_of_month");
        if (onlyActive) query = query.eq("is_active", true);
        const { data, error } = await query;
        assertNoDbError(error);
        result.expenses = data;
      }

      if (!type || type === "income") {
        let query = ctx.db
          .from("recurring_incomes")
          .select("id, description, amount, day_of_month, start_date, end_date, is_active, categories(name)")
          .eq("user_id", ctx.userId)
          .order("day_of_month");
        if (onlyActive) query = query.eq("is_active", true);
        const { data, error } = await query;
        assertNoDbError(error);
        result.incomes = data;
      }

      if (!type || type === "investment") {
        let query = ctx.db
          .from("recurring_investment_contributions")
          .select("id, amount, day_of_month, start_date, end_date, is_active, investments(name)")
          .eq("user_id", ctx.userId)
          .order("day_of_month");
        if (onlyActive) query = query.eq("is_active", true);
        const { data, error } = await query;
        assertNoDbError(error);
        result.investmentContributions = data;
      }

      return result;
    })
  );

  server.registerTool(
    "create_recurring_expense",
    {
      title: "Criar despesa fixa",
      description:
        "Cria uma despesa recorrente mensal (ex.: aluguel, academia, streaming). Ela passa a ser lançada automaticamente todo mês.",
      inputSchema: {
        amount: z.number().positive(),
        description: z.string(),
        category: z.string().describe("Nome ou id de uma categoria de despesa"),
        paymentMethod: z.string().describe("Nome ou id da forma de pagamento"),
        ...scheduleArgs,
      },
    },
    tool(async (args) => {
      const category = await resolveCategory(ctx, args.category, "expense");
      const paymentMethod = await resolvePaymentMethod(ctx, args.paymentMethod);
      const data = validate(recurringExpenseSchema, {
        categoryId: category.id,
        paymentMethodId: paymentMethod.id,
        amount: args.amount,
        description: args.description,
        dayOfMonth: args.dayOfMonth,
        startDate: args.startDate ?? today(),
        endDate: args.endDate ?? null,
        isActive: true,
      });

      const { data: row, error } = await ctx.db
        .from("recurring_expenses")
        .insert({
          user_id: ctx.userId,
          category_id: data.categoryId,
          payment_method_id: data.paymentMethodId,
          amount: data.amount,
          description: data.description,
          day_of_month: data.dayOfMonth,
          start_date: data.startDate,
          end_date: data.endDate || null,
          is_active: data.isActive,
        })
        .select("id, description, amount, day_of_month, start_date, end_date")
        .single();
      assertNoDbError(error);

      revalidate(...PATHS.expense);
      return { created: row };
    })
  );

  server.registerTool(
    "create_recurring_income",
    {
      title: "Criar receita fixa",
      description:
        "Cria uma receita recorrente mensal (ex.: salário). Ela passa a ser lançada automaticamente todo mês.",
      inputSchema: {
        amount: z.number().positive(),
        description: z.string(),
        category: z.string().optional().describe("Nome ou id de uma categoria de receita"),
        ...scheduleArgs,
      },
    },
    tool(async (args) => {
      const data = validate(recurringIncomeSchema, {
        categoryId: args.category
          ? (await resolveCategory(ctx, args.category, "income")).id
          : null,
        amount: args.amount,
        description: args.description,
        dayOfMonth: args.dayOfMonth,
        startDate: args.startDate ?? today(),
        endDate: args.endDate ?? null,
        isActive: true,
      });

      const { data: row, error } = await ctx.db
        .from("recurring_incomes")
        .insert({
          user_id: ctx.userId,
          category_id: data.categoryId || null,
          amount: data.amount,
          description: data.description,
          day_of_month: data.dayOfMonth,
          start_date: data.startDate,
          end_date: data.endDate || null,
          is_active: data.isActive,
        })
        .select("id, description, amount, day_of_month, start_date, end_date")
        .single();
      assertNoDbError(error);

      revalidate(...PATHS.income);
      return { created: row };
    })
  );

  server.registerTool(
    "create_recurring_investment_contribution",
    {
      title: "Programar aporte mensal",
      description: "Cria um aporte recorrente mensal em um investimento existente.",
      inputSchema: {
        investment: z.string().describe("Nome ou id do investimento"),
        amount: z.number().positive(),
        ...scheduleArgs,
      },
    },
    tool(async (args) => {
      const investment = await resolveInvestment(ctx, args.investment);
      const data = validate(recurringInvestmentContributionSchema, {
        investmentId: investment.id,
        amount: args.amount,
        dayOfMonth: args.dayOfMonth,
        startDate: args.startDate ?? today(),
        endDate: args.endDate ?? null,
        isActive: true,
      });

      const { data: row, error } = await ctx.db
        .from("recurring_investment_contributions")
        .insert({
          user_id: ctx.userId,
          investment_id: data.investmentId,
          amount: data.amount,
          day_of_month: data.dayOfMonth,
          start_date: data.startDate,
          end_date: data.endDate || null,
          is_active: data.isActive,
        })
        .select("id, amount, day_of_month, start_date, end_date")
        .single();
      assertNoDbError(error);

      revalidate(...PATHS.investment, `/investments/${investment.id}`);
      return { created: { ...row, investment: investment.name } };
    })
  );

  server.registerTool(
    "update_recurring",
    {
      title: "Editar recorrência",
      description:
        "Altera uma recorrência (valor, dia, data final) ou pausa/reativa com isActive. Informe só os campos que mudam. Mudanças valem para os próximos lançamentos; os já gerados não são alterados.",
      inputSchema: {
        type: recurringType,
        id: z.string().uuid(),
        amount: z.number().positive().optional(),
        description: z.string().optional().describe("Não se aplica a aportes (investment)"),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        endDate: dateArg.nullable().optional().describe("null remove a data final"),
        isActive: z.boolean().optional(),
      },
    },
    tool(async (args) => {
      const pick = <T>(next: T | undefined, current: T) => (next !== undefined ? next : current);

      if (args.type === "expense") {
        const { data: cur, error: fetchError } = await ctx.db
          .from("recurring_expenses")
          .select("*")
          .eq("id", args.id)
          .eq("user_id", ctx.userId)
          .maybeSingle();
        assertNoDbError(fetchError);
        if (!cur) throw new ToolError(`Despesa fixa ${args.id} não encontrada.`);

        const data = validate(recurringExpenseSchema, {
          categoryId: cur.category_id,
          paymentMethodId: cur.payment_method_id,
          amount: pick(args.amount, cur.amount),
          description: pick(args.description, cur.description),
          dayOfMonth: pick(args.dayOfMonth, cur.day_of_month),
          startDate: cur.start_date,
          endDate: pick(args.endDate, cur.end_date),
          isActive: pick(args.isActive, cur.is_active),
        });
        const { data: row, error } = await ctx.db
          .from("recurring_expenses")
          .update({
            amount: data.amount,
            description: data.description,
            day_of_month: data.dayOfMonth,
            end_date: data.endDate || null,
            is_active: data.isActive,
          })
          .eq("id", args.id)
          .eq("user_id", ctx.userId)
          .select("id, description, amount, day_of_month, start_date, end_date, is_active")
          .single();
        assertNoDbError(error);
        revalidate(...PATHS.expense);
        return { updated: row };
      }

      if (args.type === "income") {
        const { data: cur, error: fetchError } = await ctx.db
          .from("recurring_incomes")
          .select("*")
          .eq("id", args.id)
          .eq("user_id", ctx.userId)
          .maybeSingle();
        assertNoDbError(fetchError);
        if (!cur) throw new ToolError(`Receita fixa ${args.id} não encontrada.`);

        const data = validate(recurringIncomeSchema, {
          categoryId: cur.category_id,
          amount: pick(args.amount, cur.amount),
          description: pick(args.description, cur.description),
          dayOfMonth: pick(args.dayOfMonth, cur.day_of_month),
          startDate: cur.start_date,
          endDate: pick(args.endDate, cur.end_date),
          isActive: pick(args.isActive, cur.is_active),
        });
        const { data: row, error } = await ctx.db
          .from("recurring_incomes")
          .update({
            amount: data.amount,
            description: data.description,
            day_of_month: data.dayOfMonth,
            end_date: data.endDate || null,
            is_active: data.isActive,
          })
          .eq("id", args.id)
          .eq("user_id", ctx.userId)
          .select("id, description, amount, day_of_month, start_date, end_date, is_active")
          .single();
        assertNoDbError(error);
        revalidate(...PATHS.income);
        return { updated: row };
      }

      const { data: cur, error: fetchError } = await ctx.db
        .from("recurring_investment_contributions")
        .select("*")
        .eq("id", args.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      assertNoDbError(fetchError);
      if (!cur) throw new ToolError(`Aporte programado ${args.id} não encontrado.`);

      const data = validate(recurringInvestmentContributionSchema, {
        investmentId: cur.investment_id,
        amount: pick(args.amount, cur.amount),
        dayOfMonth: pick(args.dayOfMonth, cur.day_of_month),
        startDate: cur.start_date,
        endDate: pick(args.endDate, cur.end_date),
        isActive: pick(args.isActive, cur.is_active),
      });
      const { data: row, error } = await ctx.db
        .from("recurring_investment_contributions")
        .update({
          amount: data.amount,
          day_of_month: data.dayOfMonth,
          end_date: data.endDate || null,
          is_active: data.isActive,
        })
        .eq("id", args.id)
        .eq("user_id", ctx.userId)
        .select("id, amount, day_of_month, start_date, end_date, is_active")
        .single();
      assertNoDbError(error);
      revalidate(...PATHS.investment, `/investments/${cur.investment_id}`);
      return { updated: row };
    })
  );

  server.registerTool(
    "delete_recurring",
    {
      title: "Excluir recorrência",
      description:
        "Exclui uma recorrência. Os lançamentos já gerados permanecem. Para apenas pausar, prefira update_recurring com isActive=false. Confirme com o usuário antes.",
      inputSchema: { type: recurringType, id: z.string().uuid() },
      annotations: { destructiveHint: true },
    },
    tool(async ({ type, id }) => {
      const table =
        type === "expense"
          ? "recurring_expenses"
          : type === "income"
            ? "recurring_incomes"
            : "recurring_investment_contributions";

      const { data, error } = await ctx.db
        .from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select("id");
      assertNoDbError(error);
      if (!data?.length) throw new ToolError(`Recorrência ${id} não encontrada.`);

      revalidate(...PATHS[type]);
      return { deleted: { type, id } };
    })
  );
}
