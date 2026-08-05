/**
 * Best-effort parser for credit card statement PDFs (text already extracted).
 * Statement layouts vary a lot between issuers, so this only recognizes the
 * common "DD/MM  description  1.234,56" line shape and leaves everything
 * else for the user to fix on the review screen — it is never auto-saved.
 */

const LINE_RE =
  /^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s+(.+?)\s+(-)?(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*(-|C|D)?$/;

// e.g. "07 de ago. 2026 UBER *TRIP - R$ 25,90" or "... - + R$ 2.014,71" (Banco Inter statements)
const LINE_RE_PT_MONTH =
  /^(\d{1,2})\s+de\s+([a-zç]{3})\.?\s+(\d{4})\s+(.+)\s+-\s+(\+)?\s*R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})$/i;

const MONTHS_PT: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

const PAYMENT_KEYWORDS = [
  "pagamento",
  "estorno",
  "credito de",
  "crédito de",
  "saldo anterior",
];

export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  isLikelyPayment: boolean;
};

function parseAmount(raw: string): number {
  return Number(raw.replace(/\./g, "").replace(",", "."));
}

/**
 * Resolves a day/month pair (no year in the source line) to a full date by
 * picking whichever nearby year lands closest to the end of the reference
 * month — statement transactions are always within a few weeks of it, even
 * when the billing cycle crosses a year boundary (e.g. a January invoice
 * listing late-December purchases).
 */
function resolveDate(day: number, month: number, referenceMonthIso: string): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const refYear = Number(referenceMonthIso.slice(0, 4));
  const refMonth = Number(referenceMonthIso.slice(5, 7));
  const referencePoint = Date.UTC(refYear, refMonth, 0);

  let best: Date | null = null;
  let bestDiff = Infinity;
  for (const year of [refYear - 1, refYear, refYear + 1]) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate.getUTCMonth() !== month - 1) continue;
    const diff = Math.abs(candidate.getTime() - referencePoint);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return best;
}

function buildDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 ? date : null;
}

function looksLikePayment(description: string): boolean {
  const normalized = description.toLowerCase();
  return PAYMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/**
 * @param referenceMonthIso first day of the invoice's reference month, e.g. "2026-02-01"
 */
export function parseStatementText(
  text: string,
  referenceMonthIso: string
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;

    const match = line.match(LINE_RE);
    if (match) {
      const [, dayStr, monthStr, description, negativePrefix, amountStr, suffix] = match;
      const date = resolveDate(Number(dayStr), Number(monthStr), referenceMonthIso);
      if (!date) continue;

      const amount = parseAmount(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const trimmedDescription = description.trim();
      if (!trimmedDescription) continue;

      const isNegative = negativePrefix === "-" || suffix === "-" || suffix === "C";

      transactions.push({
        date: date.toISOString().slice(0, 10),
        description: trimmedDescription,
        amount,
        isLikelyPayment: isNegative || looksLikePayment(trimmedDescription),
      });
      continue;
    }

    const ptMatch = line.match(LINE_RE_PT_MONTH);
    if (ptMatch) {
      const [, dayStr, monthAbbrev, yearStr, description, plusPrefix, amountStr] = ptMatch;
      const month = MONTHS_PT[monthAbbrev.toLowerCase()];
      if (!month) continue;

      const date = buildDate(Number(yearStr), month, Number(dayStr));
      if (!date) continue;

      const amount = parseAmount(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const trimmedDescription = description.trim();
      if (!trimmedDescription) continue;

      transactions.push({
        date: date.toISOString().slice(0, 10),
        description: trimmedDescription,
        amount,
        isLikelyPayment: plusPrefix === "+" || looksLikePayment(trimmedDescription),
      });
    }
  }

  return transactions;
}
