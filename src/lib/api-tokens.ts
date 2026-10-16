import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "pp_";

export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashApiToken(token), prefix: token.slice(0, 10) };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
