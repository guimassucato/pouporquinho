import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { expenseSchema } from "@/lib/validations/expenses";
import { incomeSchema } from "@/lib/validations/incomes";
import { ensureRecurringExpensesForMonth } from "@/lib/finance/recurring";
import { ensureRecurringIncomesForMonth } from "@/lib/finance/income-recurring";
import {
  type McpContext,
  ToolError,
  assertNoDbError,
  dateArg,
  monthArg,
  monthEnd,
  monthStart,
  resolveCategory,
  resolvePaymentMethod,
  revalidate,
  round2,
  today,
  tool,
  validate,
} from "../context";

const EXPENSE_COLUMNS =
  "id, amount, description, expense_date, notes, recurring_expense_id, categories(name), payment_methods(name)";
const INCOME_COLUMNS =
  "id, amount, description, income_date, recurring_income_id, categories(name)";

const periodArgs = {
  month: monthArg.optional(),
  from: dateArg.optional().describe("Data inicial (AAAA-MM-DD). Ignorado se `month` for informado."),
  to: dateArg.optional().describe("Data final (AAAA-MM-DD). Ignorado se `month` for informado."),
};

function resolvePeriod(args: { month?: string; from?: string; to?: string }) {
  if (args.month || (!args.from && !args.to)) {
    const start = monthStart(args.month);
    return { from: start, to: monthEnd(start), singleMonth: start };
  }
  return { from: args.from ?? "0001-01-01", to: args.to ?? "9999-12-31", singleMonth: null };
}

export function registerTransactionTools(server: McpServer, ctx: McpContext) {
  // --- Despesas -------------------------------------------------------------

  server.registerTool(
    "create_expense",
    {
      title: "Registrar despesa",
      description:
        "Registra uma despesa (gasto). Categoria e forma de pagamento aceitam o nome (ex.: \"Mercado\", \"Nubank\") ou o id. Se não souber quais existem, use list_categories / list_payment_methods.",
      inputSchema: {
        amount: z.number().positive().describe("Valor em reais, ex.: 52.9"),
        description: z.string().describe("Descrição curta, ex.: \"Almoço\""),
        category: z.string().describe("Nome ou id de uma categoria de despesa"),
        paymentMethod: z.string().describe("Nome ou id da forma de pagamento"),
        date: dateArg.optional().describe("Data da despesa (AAAA-MM-DD). Padrão: hoje."),
        notes: z.string().optional().describe("Observações opcionais"),
      },
    },
    tool(async (args) => {
      const category = await resolveCategory(ctx, args.category, "expense");
      const paymentMethod = await resolvePaymentMethod(ctx, args.paymentMethod);
      const data = validate(expenseSchema, {
        categoryId: category.id,
        paymentMethodId: paymentMethod.id,
        amount: args.amount,
        description: args.description,
        expenseDate: args.date ?? today(),
        notes: args.notes ?? null,
      });

      const { data: row, error } = await ctx.db
        .from("expenses")
        .insert({
          user_id: ctx.userId,
          category_id: data.categoryId,
          payment_method_id: data.paymentMethodId,
          amount: data.amount,
          description: data.description,
          expense_date: data.expenseDate,
          notes: data.notes || null,
        })
        .select(EXPENSE_COLUMNS)
        .single();
      assertNoDbError(error);

      revalidate("/expenses", "/dashboard");
      return { created: row };
    })
  );

  server.registerTool(
    "update_expense",
    {
      title: "Editar despesa",
      description:
        "Altera uma despesa existente. Informe o id (obtido em list_expenses) e apenas os campos que mudam.",
      inputSchema: {
        id: z.string().uuid(),
        amount: z.number().positive().optional(),
        description: z.string().optional(),
        category: z.string().optional().describe("Nome ou id da nova categoria"),
        paymentMethod: z.string().optional().describe("Nome ou id da nova forma de pagamento"),
        date: dateArg.optional(),
        notes: z.string().nullable().optional(),
      },
    },
    tool(async (args) => {
      const { data: current, error: fetchError } = await ctx.db
        .from("expenses")
        .select("*")
        .eq("id", args.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      assertNoDbError(fetchError);
      if (!current) throw new ToolError(`Despesa ${args.id} não encontrada.`);

      const data = validate(expenseSchema, {
        categoryId: args.category
          ? (await resolveCategory(ctx, args.category, "expense")).id
          : current.category_id,
        paymentMethodId: args.paymentMethod
          ? (await resolvePaymentMethod(ctx, args.paymentMethod)).id
          : current.payment_method_id,
        amount: args.amount ?? current.amount,
        description: args.description ?? current.description,
        expenseDate: args.date ?? current.expense_date,
        notes: args.notes !== undefined ? args.notes : current.notes,
      });

      const { data: row, error } = await ctx.db
        .from("expenses")
        .update({
          category_id: data.categoryId,
          payment_method_id: data.paymentMethodId,
          amount: data.amount,
          description: data.description,
          expense_date: data.expenseDate,
          notes: data.notes || null,
        })
        .eq("id", args.id)
        .eq("user_id", ctx.userId)
        .select(EXPENSE_COLUMNS)
        .single();
      assertNoDbError(error);

      revalidate("/expenses", "/dashboard");
      return { updated: row };
    })
  );

  server.registerTool(
    "delete_expense",
    {
      title: "Excluir despesa",
      description: "Exclui uma despesa pelo id. Confirme com o usuário antes de excluir.",
      inputSchema: { id: z.string().uuid() },
      annotations: { destructiveHint: true },
    },
    tool(async ({ id }) => {
      const { data, error } = await ctx.db
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select("id, description, amount, expense_date");
      assertNoDbError(error);
      if (!data?.length) throw new ToolError(`Despesa ${id} não encontrada.`);

      revalidate("/expenses", "/dashboard");
      return { deleted: data[0] };
    })
  );

  server.registerTool(
    "list_expenses",
    {
      title: "Listar despesas",
      description:
        "Lista despesas de um mês (padrão: mês atual) ou de um intervalo de datas, com filtros opcionais. Retorna também o total do período filtrado.",
      inputSchema: {
        ...periodArgs,
        category: z.string().optional().describe("Filtrar por categoria (nome ou id)"),
        paymentMethod: z.string().optional().describe("Filtrar por forma de pagamento (nome ou id)"),
        search: z.string().optional().describe("Trecho da descrição"),
        limit: z.number().int().min(1).max(500).default(100),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args) => {
      const period = resolvePeriod(args);
      // Same as opening /expenses: materialize this month's recurring expenses first.
      if (period.singleMonth) {
        await ensureRecurringExpensesForMonth(ctx.db, ctx.userId, period.singleMonth);
      }

      let query = ctx.db
        .from("expenses")
        .select(EXPENSE_COLUMNS)
        .eq("user_id", ctx.userId)
        .gte("expense_date", period.from)
        .lte("expense_date", period.to)
        .order("expense_date", { ascending: false })
        .limit(args.limit);
      if (args.category) {
        query = query.eq("category_id", (await resolveCategory(ctx, args.category, "expense")).id);
      }
      if (args.paymentMethod) {
        query = query.eq(
          "payment_method_id",
          (await resolvePaymentMethod(ctx, args.paymentMethod)).id
        );
      }
      if (args.search) query = query.ilike("description", `%${args.search}%`);

      const { data, error } = await query;
      assertNoDbError(error);
      const items = data ?? [];
      return {
        period: { from: period.from, to: period.to },
        count: items.length,
        total: round2(items.reduce((sum, e) => sum + e.amount, 0)),
        truncated: items.length === args.limit,
        items,
      };
    })
  );

  // --- Receitas -------------------------------------------------------------

  server.registerTool(
    "create_income",
    {
      title: "Registrar receita",
      description:
        "Registra uma receita (entrada de dinheiro, ex.: salário, freela). Categoria é opcional e aceita nome ou id de uma categoria de receita.",
      inputSchema: {
        amount: z.number().positive().describe("Valor em reais"),
        description: z.string(),
        category: z.string().optional().describe("Nome ou id de uma categoria de receita"),
        date: dateArg.optional().describe("Data da receita (AAAA-MM-DD). Padrão: hoje."),
      },
    },
    tool(async (args) => {
      const data = validate(incomeSchema, {
        categoryId: args.category
          ? (await resolveCategory(ctx, args.category, "income")).id
          : null,
        amount: args.amount,
        description: args.description,
        incomeDate: args.date ?? today(),
      });

      const { data: row, error } = await ctx.db
        .from("incomes")
        .insert({
          user_id: ctx.userId,
          category_id: data.categoryId || null,
          amount: data.amount,
          description: data.description,
          income_date: data.incomeDate,
        })
        .select(INCOME_COLUMNS)
        .single();
      assertNoDbError(error);

      revalidate("/incomes", "/dashboard");
      return { created: row };
    })
  );

  server.registerTool(
    "update_income",
    {
      title: "Editar receita",
      description: "Altera uma receita existente. Informe o id e apenas os campos que mudam.",
      inputSchema: {
        id: z.string().uuid(),
        amount: z.number().positive().optional(),
        description: z.string().optional(),
        category: z
          .string()
          .nullable()
          .optional()
          .describe("Nome ou id da categoria; null remove a categoria"),
        date: dateArg.optional(),
      },
    },
    tool(async (args) => {
      const { data: current, error: fetchError } = await ctx.db
        .from("incomes")
        .select("*")
        .eq("id", args.id)
        .eq("user_id", ctx.userId)
        .maybeSingle();
      assertNoDbError(fetchError);
      if (!current) throw new ToolError(`Receita ${args.id} não encontrada.`);

      let categoryId = current.category_id;
      if (args.category === null) categoryId = null;
      else if (args.category) categoryId = (await resolveCategory(ctx, args.category, "income")).id;

      const data = validate(incomeSchema, {
        categoryId,
        amount: args.amount ?? current.amount,
        description: args.description ?? current.description,
        incomeDate: args.date ?? current.income_date,
      });

      const { data: row, error } = await ctx.db
        .from("incomes")
        .update({
          category_id: data.categoryId || null,
          amount: data.amount,
          description: data.description,
          income_date: data.incomeDate,
        })
        .eq("id", args.id)
        .eq("user_id", ctx.userId)
        .select(INCOME_COLUMNS)
        .single();
      assertNoDbError(error);

      revalidate("/incomes", "/dashboard");
      return { updated: row };
    })
  );

  server.registerTool(
    "delete_income",
    {
      title: "Excluir receita",
      description: "Exclui uma receita pelo id. Confirme com o usuário antes de excluir.",
      inputSchema: { id: z.string().uuid() },
      annotations: { destructiveHint: true },
    },
    tool(async ({ id }) => {
      const { data, error } = await ctx.db
        .from("incomes")
        .delete()
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .select("id, description, amount, income_date");
      assertNoDbError(error);
      if (!data?.length) throw new ToolError(`Receita ${id} não encontrada.`);

      revalidate("/incomes", "/dashboard");
      return { deleted: data[0] };
    })
  );

  server.registerTool(
    "list_incomes",
    {
      title: "Listar receitas",
      description:
        "Lista receitas de um mês (padrão: mês atual) ou de um intervalo de datas. Retorna também o total do período.",
      inputSchema: {
        ...periodArgs,
        category: z.string().optional().describe("Filtrar por categoria (nome ou id)"),
        search: z.string().optional().describe("Trecho da descrição"),
        limit: z.number().int().min(1).max(500).default(100),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async (args) => {
      const period = resolvePeriod(args);
      if (period.singleMonth) {
        await ensureRecurringIncomesForMonth(ctx.db, ctx.userId, period.singleMonth);
      }

      let query = ctx.db
        .from("incomes")
        .select(INCOME_COLUMNS)
        .eq("user_id", ctx.userId)
        .gte("income_date", period.from)
        .lte("income_date", period.to)
        .order("income_date", { ascending: false })
        .limit(args.limit);
      if (args.category) {
        query = query.eq("category_id", (await resolveCategory(ctx, args.category, "income")).id);
      }
      if (args.search) query = query.ilike("description", `%${args.search}%`);

      const { data, error } = await query;
      assertNoDbError(error);
      const items = data ?? [];
      return {
        period: { from: period.from, to: period.to },
        count: items.length,
        total: round2(items.reduce((sum, i) => sum + i.amount, 0)),
        truncated: items.length === args.limit,
        items,
      };
    })
  );
}
