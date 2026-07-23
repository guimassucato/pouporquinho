"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile";
import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";

export function SettingsClient({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName },
  });

  function onSubmit(data: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Perfil atualizado");
    });
  }

  return (
    <div>
      <PageHeader title="Configurações" description="Perfil e preferências da conta" />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Nome</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isPending} className="w-fit">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
