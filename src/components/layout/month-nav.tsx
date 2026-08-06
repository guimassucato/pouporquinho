"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/finance/format";

function shiftMonth(monthIso: string, delta: number) {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

export function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <Button
        variant="ghost"
        size="icon-sm"
        render={
          <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} aria-label="Mês anterior" />
        }
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-36 px-2 text-center text-sm font-medium capitalize">
        {formatMonth(month)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        render={
          <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} aria-label="Próximo mês" />
        }
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
