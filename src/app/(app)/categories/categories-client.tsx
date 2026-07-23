"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Archive, ArchiveRestore, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryFormDialog } from "@/components/forms/category-form-dialog";
import { deleteCategory, setCategoryArchived } from "@/actions/categories";
import { getCategoryIcon } from "@/lib/finance/icons";
import type { Tables as TablesType } from "@/types/database.types";

type Category = TablesType<"categories">;

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    category: Category | null;
  }>({ open: false, category: null });
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  function handleDelete(category: Category) {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Categoria excluída");
    });
  }

  function handleToggleArchive(category: Category) {
    startTransition(async () => {
      const result = await setCategoryArchived(category.id, !category.is_archived);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(category.is_archived ? "Categoria reativada" : "Categoria arquivada");
    });
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        description="Organize despesas e receitas por categoria"
        actions={
          <Button
            onClick={() => setDialogState({ open: true, category: null })}
          >
            <Plus /> Nova categoria
          </Button>
        }
      />

      <Tabs value={kind} onValueChange={(v) => setKind(v as "expense" | "income")}>
        <TabsList>
          <TabsTrigger value="expense">Despesas</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  Nenhuma categoria de {kind === "expense" ? "despesa" : "receita"} ainda.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((category) => {
              const Icon = getCategoryIcon(category.icon);
              return (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="flex size-7 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {category.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {category.is_archived ? (
                      <Badge variant="secondary">Arquivada</Badge>
                    ) : (
                      <Badge variant="outline">Ativa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setDialogState({ open: true, category })}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleToggleArchive(category)}
                        aria-label={category.is_archived ? "Reativar" : "Arquivar"}
                      >
                        {category.is_archived ? <ArchiveRestore /> : <Archive />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => handleDelete(category)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CategoryFormDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        category={dialogState.category}
      />
    </div>
  );
}
