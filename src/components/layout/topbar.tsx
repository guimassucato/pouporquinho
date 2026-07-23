"use client";

import { useTheme } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({ email }: { email: string | null }) {
  const { setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <span className="text-sm text-muted-foreground">{email}</span>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" aria-label="Alternar tema" />}
          >
            <Sun className="size-4 scale-100 rotate-0 dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-4 scale-0 rotate-90 dark:scale-100 dark:rotate-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Claro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Escuro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>Sistema</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <form action={logout}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
