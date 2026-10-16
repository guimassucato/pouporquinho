import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Database } from "@/types/database.types";

/**
 * Every MCP tool runs with the admin (RLS-bypassing) client, authenticated
 * by an API token instead of a session. Ownership is therefore enforced by
 * hand: every query MUST filter by `userId`, and every insert MUST set it.
 */
export type McpContext = {
  db: SupabaseClient<Database>;
  userId: string;
};

// Thrown inside tool handlers for user-facing errors (bad input, not found);
// `tool()` turns it into an `isError` result the agent can read and recover from.
export class ToolError extends Error {}

export function tool<Args>(
  handler: (args: Args) => Promise<unknown>
): (args: Args) => Promise<CallToolResult> {
  return async (args) => {
    try {
      const data = await handler(args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      if (err instanceof ToolError) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
      throw err;
    }
  };
}

export function assertNoDbError(error: { message: string; code?: string } | null) {
  if (error) throw new ToolError(`Erro no banco de dados: ${error.message}`);
}

/** Validates with one of the app's zod schemas, surfacing its pt-BR message. */
export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".");
    throw new ToolError(
      `Dados inválidos${field ? ` (${field})` : ""}: ${issue?.message ?? "verifique os campos"}`
    );
  }
  return parsed.data;
}

export function revalidate(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

// --- Dates ------------------------------------------------------------------
// The app's users are in Brazil; "today" for an agent message sent at 22h
// must not roll over to tomorrow just because the server runs in UTC.
const TIME_ZONE = "America/Sao_Paulo";

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export const dateArg = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");

export const monthArg = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Use o formato AAAA-MM")
  .describe("Mês no formato AAAA-MM. Padrão: mês atual.");

/** Normalizes "2026-10" / "2026-10-15" / undefined to "2026-10-01". */
export function monthStart(month?: string): string {
  return `${(month ?? today()).slice(0, 7)}-01`;
}

export function monthEnd(monthIso: string): string {
  const [year, month] = monthIso.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// --- Name-or-id resolution --------------------------------------------------
// Agents talk in names ("mercado", "Nubank"), the database in UUIDs. Lookup
// args accept either so a simple "gastei 50 no mercado no nubank" needs a
// single tool call instead of two list calls first.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

function pickByRef<T extends { id: string; name: string }>(
  rows: T[],
  ref: string,
  label: string
): T {
  if (UUID_RE.test(ref)) {
    const byId = rows.find((r) => r.id === ref);
    if (byId) return byId;
    throw new ToolError(`${label} com id "${ref}" não encontrado(a).`);
  }

  const needle = normalize(ref);
  const exact = rows.filter((r) => normalize(r.name) === needle);
  if (exact.length === 1) return exact[0];

  const partial = rows.filter((r) => normalize(r.name).includes(needle));
  if (partial.length === 1) return partial[0];

  const options = rows.map((r) => r.name).join(", ") || "nenhuma cadastrada";
  throw new ToolError(
    partial.length > 1
      ? `"${ref}" é ambíguo para ${label}. Correspondências: ${partial.map((r) => r.name).join(", ")}.`
      : `${label} "${ref}" não encontrado(a). Opções disponíveis: ${options}.`
  );
}

export async function resolveCategory(
  ctx: McpContext,
  ref: string,
  kind: "expense" | "income"
) {
  const { data, error } = await ctx.db
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("is_archived", false);
  assertNoDbError(error);
  return pickByRef(data ?? [], ref, kind === "expense" ? "Categoria de despesa" : "Categoria de receita");
}

export async function resolvePaymentMethod(ctx: McpContext, ref: string) {
  const { data, error } = await ctx.db
    .from("payment_methods")
    .select("id, name, kind")
    .eq("user_id", ctx.userId)
    .eq("is_archived", false);
  assertNoDbError(error);
  return pickByRef(data ?? [], ref, "Forma de pagamento");
}

export async function resolveInvestment(ctx: McpContext, ref: string) {
  const { data, error } = await ctx.db
    .from("investments")
    .select("id, name, type")
    .eq("user_id", ctx.userId)
    .eq("is_archived", false);
  assertNoDbError(error);
  return pickByRef(data ?? [], ref, "Investimento");
}
