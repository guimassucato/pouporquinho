import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { categorySchema } from "@/lib/validations/categories";
import { paymentMethodSchema } from "@/lib/validations/payment-methods";
import { CATEGORY_COLORS, CATEGORY_ICONS, PAYMENT_METHOD_ICONS } from "@/lib/finance/icons";
import { type McpContext, ToolError, assertNoDbError, revalidate, tool, validate } from "../context";

const DEFAULT_PAYMENT_ICON: Record<string, string> = {
  cash: "banknote",
  debit: "wallet",
  credit: "credit-card",
  pix: "qr-code",
  other: "other",
};

export function registerCatalogTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_categories",
    {
      title: "Listar categorias",
      description: "Lista as categorias de despesa e/ou receita do usuário.",
      inputSchema: {
        kind: z.enum(["expense", "income"]).optional().describe("Padrão: ambas"),
        includeArchived: z.boolean().default(false),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ kind, includeArchived }) => {
      let query = ctx.db
        .from("categories")
        .select("id, name, kind, is_archived")
        .eq("user_id", ctx.userId)
        .order("kind")
        .order("name");
      if (kind) query = query.eq("kind", kind);
      if (!includeArchived) query = query.eq("is_archived", false);

      const { data, error } = await query;
      assertNoDbError(error);
      return data;
    })
  );

  server.registerTool(
    "create_category",
    {
      title: "Criar categoria",
      description: "Cria uma nova categoria de despesa ou de receita.",
      inputSchema: {
        name: z.string(),
        kind: z.enum(["expense", "income"]),
        icon: z
          .enum(Object.keys(CATEGORY_ICONS) as [string, ...string[]])
          .optional()
          .describe("Ícone. Padrão: other"),
        color: z.string().optional().describe("Cor hex (#RRGGBB). Padrão: escolhida automaticamente"),
      },
    },
    tool(async (args) => {
      const { count } = await ctx.db
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.userId);

      const data = validate(categorySchema, {
        name: args.name,
        kind: args.kind,
        icon: args.icon ?? "other",
        color: args.color ?? CATEGORY_COLORS[(count ?? 0) % CATEGORY_COLORS.length],
      });

      const { data: row, error } = await ctx.db
        .from("categories")
        .insert({ ...data, user_id: ctx.userId })
        .select("id, name, kind")
        .single();
      if (error?.code === "23505") {
        throw new ToolError(`Já existe uma categoria "${data.name}" desse tipo.`);
      }
      assertNoDbError(error);

      revalidate("/categories");
      return { created: row };
    })
  );

  server.registerTool(
    "list_payment_methods",
    {
      title: "Listar formas de pagamento",
      description:
        "Lista as formas de pagamento (cartões, conta, pix, dinheiro). Para cartões de crédito inclui dia de fechamento, vencimento e limite.",
      inputSchema: { includeArchived: z.boolean().default(false) },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ includeArchived }) => {
      let query = ctx.db
        .from("payment_methods")
        .select("id, name, kind, closing_day, due_day, credit_limit, is_archived")
        .eq("user_id", ctx.userId)
        .order("name");
      if (!includeArchived) query = query.eq("is_archived", false);

      const { data, error } = await query;
      assertNoDbError(error);
      return data;
    })
  );

  server.registerTool(
    "create_payment_method",
    {
      title: "Criar forma de pagamento",
      description:
        "Cria uma forma de pagamento. Para cartão de crédito (kind=credit), closingDay e dueDay são obrigatórios.",
      inputSchema: {
        name: z.string(),
        kind: z.enum(["cash", "debit", "credit", "pix", "other"]),
        closingDay: z.number().int().min(1).max(31).optional().describe("Dia de fechamento da fatura"),
        dueDay: z.number().int().min(1).max(31).optional().describe("Dia de vencimento da fatura"),
        creditLimit: z.number().positive().optional(),
        icon: z.enum(Object.keys(PAYMENT_METHOD_ICONS) as [string, ...string[]]).optional(),
        color: z.string().optional().describe("Cor hex (#RRGGBB)"),
      },
    },
    tool(async (args) => {
      const data = validate(paymentMethodSchema, {
        name: args.name,
        kind: args.kind,
        icon: args.icon ?? DEFAULT_PAYMENT_ICON[args.kind],
        color: args.color ?? "#64748b",
        closingDay: args.closingDay ?? null,
        dueDay: args.dueDay ?? null,
        creditLimit: args.creditLimit ?? null,
      });

      const { data: row, error } = await ctx.db
        .from("payment_methods")
        .insert({
          user_id: ctx.userId,
          name: data.name,
          kind: data.kind,
          icon: data.icon,
          color: data.color,
          // Card-only fields, dropped for other kinds (same as the payment-methods action).
          closing_day: data.kind === "credit" ? (data.closingDay ?? null) : null,
          due_day: data.kind === "credit" ? (data.dueDay ?? null) : null,
          credit_limit: data.kind === "credit" ? (data.creditLimit ?? null) : null,
        })
        .select("id, name, kind, closing_day, due_day, credit_limit")
        .single();
      assertNoDbError(error);

      revalidate("/payment-methods");
      return { created: row };
    })
  );
}
