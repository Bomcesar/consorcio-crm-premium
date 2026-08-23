"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Usuario } from "@/repositories/client/usuarios.repository";

export async function createUsuarioAction(
  email: string,
  password: string,
  nome: string,
  perfil: string
): Promise<Usuario> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error("Não foi possível criar o usuário.");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    nome,
    email,
    perfil,
    ativo: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error("Não foi possível criar o perfil do usuário.");
  }

  revalidatePath("/configuracoes");

  return {
    id: data.user.id,
    nome,
    email,
    perfil,
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
