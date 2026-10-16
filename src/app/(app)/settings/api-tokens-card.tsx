"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createApiToken, deleteApiToken } from "@/actions/api-tokens";
import { formatDate } from "@/lib/finance/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ApiTokenRow = {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

export function ApiTokensCard({ apiTokens }: { apiTokens: ApiTokenRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createApiToken({ name });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setNewToken(result.token);
      setName("");
    });
  }

  function handleDelete(token: ApiTokenRow) {
    if (!confirm(`Revogar o token "${token.name}"? Agentes que o usam perderão o acesso.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteApiToken(token.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Token revogado");
    });
  }

  async function handleCopy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    toast.success("Token copiado");
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-base">Tokens de API (MCP)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Use um token para conectar agentes de IA ao endpoint{" "}
          <code className="text-xs">/api/mcp</code>. Ele dá acesso total aos seus dados
          financeiros — guarde-o como uma senha.
        </p>

        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="tokenName">Nome</Label>
            <Input
              id="tokenName"
              placeholder="Ex.: Hermes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending || !name.trim()}>
            <KeyRound />
            Gerar
          </Button>
        </form>

        {newToken && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
            <p className="text-sm font-medium">
              Copie agora — este token não será exibido novamente.
            </p>
            <div className="flex gap-2">
              <Input value={newToken} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar">
                <Copy />
              </Button>
            </div>
          </div>
        )}

        {apiTokens.length > 0 && (
          <ul className="flex flex-col divide-y rounded-md border">
            {apiTokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-2 p-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{token.name}</span>
                  <span className="text-xs text-muted-foreground">
                    <code>{token.token_prefix}…</code> · criado em{" "}
                    {formatDate(token.created_at.slice(0, 10))}
                    {token.last_used_at &&
                      ` · usado em ${formatDate(token.last_used_at.slice(0, 10))}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => handleDelete(token)}
                  aria-label="Revogar"
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
