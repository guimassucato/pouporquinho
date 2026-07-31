import {
  Landmark,
  LineChart,
  Layers,
  Bitcoin,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import type { Indexador, InvestmentTransactionType } from "./investment-yield";

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  renda_fixa: "Renda fixa",
  renda_variavel: "Renda variável",
  fundo: "Fundo",
  cripto: "Criptomoeda",
  previdencia: "Previdência",
};

const INVESTMENT_TYPE_ICONS: Record<string, LucideIcon> = {
  renda_fixa: Landmark,
  renda_variavel: LineChart,
  fundo: Layers,
  cripto: Bitcoin,
  previdencia: Umbrella,
};

export const INVESTMENT_TYPE_COLORS: Record<string, string> = {
  renda_fixa: "#3b82f6",
  renda_variavel: "#22c55e",
  fundo: "#f59e0b",
  cripto: "#f97316",
  previdencia: "#8b5cf6",
};

export const INDEXADOR_LABELS: Record<string, string> = {
  cdi: "CDI",
  ipca: "IPCA",
  selic: "Selic",
  prefixado: "Prefixado",
};

export const TRANSACTION_TYPE_LABELS: Record<InvestmentTransactionType, string> = {
  aporte: "Aporte",
  resgate: "Resgate",
  rendimento_reinvestido: "Rendimento reinvestido",
  rendimento_sacado: "Rendimento sacado",
};

export function getInvestmentTypeIcon(type: string): LucideIcon {
  return INVESTMENT_TYPE_ICONS[type] ?? Layers;
}

export function formatInvestmentRate(investment: {
  type: string;
  indexador: string | null;
  rate_percent: number | null;
}): string {
  if (
    investment.type !== "renda_fixa" ||
    investment.indexador == null ||
    investment.rate_percent == null
  ) {
    return "Manual";
  }
  const indexLabel = INDEXADOR_LABELS[investment.indexador] ?? investment.indexador;
  if (investment.indexador === "prefixado") return `${investment.rate_percent}% a.a.`;
  if (investment.indexador === "ipca") return `${indexLabel} + ${investment.rate_percent}% a.a.`;
  return `${investment.rate_percent}% do ${indexLabel}`;
}

export function rateLabel(indexador: Indexador | null | undefined): string {
  switch (indexador) {
    case "prefixado":
      return "Taxa prefixada (% a.a.)";
    case "cdi":
      return "% do CDI";
    case "selic":
      return "% do Selic";
    case "ipca":
      return "Spread sobre o IPCA (p.p. a.a.)";
    default:
      return "Taxa (%)";
  }
}
