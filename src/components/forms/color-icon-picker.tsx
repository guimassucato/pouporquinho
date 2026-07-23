"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/finance/icons";
import type { LucideIcon } from "lucide-react";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "size-7 rounded-full ring-offset-2 ring-offset-background transition-transform",
            value === color
              ? "ring-2 ring-foreground scale-110"
              : "hover:scale-110"
          )}
          style={{ backgroundColor: color }}
          aria-label={`Cor ${color}`}
        />
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
  icons,
}: {
  value: string;
  onChange: (icon: string) => void;
  icons: Record<string, LucideIcon>;
}) {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
      {Object.entries(icons).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={cn(
            "flex size-9 items-center justify-center rounded-md border transition-colors",
            value === name
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground hover:bg-muted"
          )}
          aria-label={name}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
