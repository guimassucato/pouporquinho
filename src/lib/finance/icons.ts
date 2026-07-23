import {
  ShoppingCart,
  Home,
  Car,
  Utensils,
  HeartPulse,
  GraduationCap,
  Plane,
  Gamepad2,
  Briefcase,
  Wallet,
  Gift,
  PawPrint,
  Zap,
  Smartphone,
  Shirt,
  Dumbbell,
  Landmark,
  CreditCard,
  QrCode,
  Banknote,
  TrendingUp,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  home: Home,
  car: Car,
  utensils: Utensils,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  plane: Plane,
  gamepad: Gamepad2,
  briefcase: Briefcase,
  wallet: Wallet,
  gift: Gift,
  pet: PawPrint,
  zap: Zap,
  smartphone: Smartphone,
  shirt: Shirt,
  dumbbell: Dumbbell,
  "trending-up": TrendingUp,
  other: MoreHorizontal,
};

export const PAYMENT_METHOD_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  "credit-card": CreditCard,
  landmark: Landmark,
  "qr-code": QrCode,
  banknote: Banknote,
  other: MoreHorizontal,
};

export const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#64748b",
];

export function getCategoryIcon(icon: string): LucideIcon {
  return CATEGORY_ICONS[icon] ?? MoreHorizontal;
}

export function getPaymentMethodIcon(icon: string): LucideIcon {
  return PAYMENT_METHOD_ICONS[icon] ?? MoreHorizontal;
}
