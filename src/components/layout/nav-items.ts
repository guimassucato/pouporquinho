import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  LineChart,
  Tag,
  CreditCard,
  PiggyBank,
  Repeat,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Despesas", icon: Receipt },
  { href: "/incomes", label: "Receitas", icon: TrendingUp },
  { href: "/investments", label: "Investimentos", icon: LineChart },
  { href: "/categories", label: "Categorias", icon: Tag },
  { href: "/payment-methods", label: "Formas de pagamento", icon: CreditCard },
  { href: "/budgets", label: "Orçamentos", icon: PiggyBank },
  { href: "/recurring", label: "Recorrentes", icon: Repeat },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export const mobilePrimaryNavItems: NavItem[] = navItems.slice(0, 3);
