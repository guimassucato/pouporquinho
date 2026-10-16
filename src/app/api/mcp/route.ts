import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiToken } from "@/lib/api-tokens";
import { createMcpServer } from "@/lib/mcp/server";

// MCP over Streamable HTTP, stateless: every request builds a fresh server
// bound to the token's owner, so nothing is shared between requests/users.

async function authenticate(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", hashApiToken(match[1]))
    .maybeSingle();
  if (!data) return null;

  // Best-effort usage tracking; never block the request on it.
  void db
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return data.user_id;
}

function unauthorized() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32001, message: "Token inválido ou ausente. Gere um em Configurações → Tokens de API." },
      id: null,
    },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="pouporquinho"' } }
  );
}

async function handle(request: Request): Promise<Response> {
  const userId = await authenticate(request);
  if (!userId) return unauthorized();

  const server = createMcpServer({ db: createAdminClient(), userId });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
