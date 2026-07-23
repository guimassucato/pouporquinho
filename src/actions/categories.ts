"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validations/categories";

export type ActionResult = { error: string } | { success: true };

export async function createCategory(input: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, user_id: user.id });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome"
          : error.message,
    };
  }

  revalidatePath("/categories");
  return { success: true };
}

export async function updateCategory(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome"
          : error.message,
    };
  }

  revalidatePath("/categories");
  return { success: true };
}

export async function setCategoryArchived(
  id: string,
  isArchived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("categories")
    .update({ is_archived: isArchived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/categories");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Essa categoria está em uso e não pode ser excluída. Arquive-a em vez disso."
          : error.message,
    };
  }

  revalidatePath("/categories");
  return { success: true };
}
