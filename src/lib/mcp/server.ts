import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type McpContext, today } from "./context";
import { registerCatalogTools } from "./tools/catalog";
import { registerInvoiceTools } from "./tools/invoices";
import { registerInvestmentTools } from "./tools/investments";
import { registerRecurringTools } from "./tools/recurring";
import { registerSummaryTools } from "./tools/summary";
import { registerTransactionTools } from "./tools/transactions";

export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: "pouporquinho", version: "1.0.0" },
    {
      instructions: [
        "Pouporquinho é o app de finanças pessoais do usuário (valores em reais, BRL).",
        `Hoje é ${today()} (America/Sao_Paulo). Datas usam AAAA-MM-DD e meses AAAA-MM.`,
        "Categorias, formas de pagamento e investimentos podem ser passados pelo nome; se o nome não for encontrado, o erro lista as opções válidas.",
        "Despesas fixas/receitas fixas/aportes programados são lançados automaticamente todo mês — não registre manualmente o que já é recorrente.",
        "Antes de excluir qualquer coisa, confirme com o usuário.",
      ].join("\n"),
    }
  );

  registerTransactionTools(server, ctx);
  registerSummaryTools(server, ctx);
  registerInvoiceTools(server, ctx);
  registerCatalogTools(server, ctx);
  registerRecurringTools(server, ctx);
  registerInvestmentTools(server, ctx);

  return server;
}
