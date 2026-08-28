"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Perfil } from "@/types/database.types";
import type { Usuario } from "@/repositories/client/usuarios.repository";

export async function createUsuarioAction(
  email: string,
  password: string,
  nome: string,
  perfil: Perfil
): Promise<Usuario> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("[createUsuarioAction] auth.admin.createUser error", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    throw new Error("Não foi possível criar o usuário.");
  }

  if (!data.user) {
    console.error("[createUsuarioAction] auth.admin.createUser retornou data sem user");
    throw new Error("Não foi possível criar o usuário.");
  }

  console.log("[createUsuarioAction] auth user criado", { id: data.user.id });

  const { error: confirmError } = await supabase.auth.admin.updateUserById(data.user.id, {
    password,
  });

  if (confirmError) {
    console.error("[createUsuarioAction] auth.admin.updateUserById password reset error", {
      message: confirmError.message,
      status: confirmError.status,
      code: confirmError.code,
    });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        nome,
        email,
        perfil,
        ativo: true,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("[createUsuarioAction] profiles upsert error", {
      message: profileError.message,
      code: profileError.code,
    });
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error("Não foi possível criar o perfil do usuário.");
  }

  console.log("[createUsuarioAction] profile criado/atualizado", { userId: data.user.id });

  if (perfil === "Indicador") {
    const { error: indicadorError } = await supabase.from("indicadores").insert({
      nome,
      email,
      telefone: "",
      cidade: "",
      estado: "",
      cpf: "",
      pix: "",
      origem: "Cadastro manual",
      status: "Ativo",
      observacoes: "",
      ativo: true,
      usuario_id: data.user.id,
    });

    if (indicadorError) {
      console.error("[createUsuarioAction] indicadores insert error", {
        message: indicadorError.message,
        code: indicadorError.code,
      });
    } else {
      console.log("[createUsuarioAction] indicador criado", { userId: data.user.id });
    }
  }

  revalidatePath("/configuracoes");

  return {
    id: data.user.id,
    nome,
    email,
    perfil,
    ativo: true,
    avatar_url: null,
    ultimo_login: null,
    gestor_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function resetSenhaUsuarioAction(usuarioId: string, novaSenha: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.updateUserById(usuarioId, {
    password: novaSenha,
  });

  if (error) {
    console.error("[resetSenhaUsuarioAction] auth.admin.updateUserById error", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    throw new Error("Não foi possível atualizar a senha.");
  }

  revalidatePath("/configuracoes");
}

export async function deleteUsuarioAction(usuarioId: string) {
  const supabase = createAdminClient();

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(usuarioId);
  if (deleteAuthError) {
    console.error("[deleteUsuarioAction] auth.admin.deleteUser error", {
      message: deleteAuthError.message,
      status: deleteAuthError.status,
      code: deleteAuthError.code,
    });
    throw new Error("Não foi possível excluir o usuário do Auth.");
  }

  const { error: deleteProfileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", usuarioId);

  if (deleteProfileError) {
    console.error("[deleteUsuarioAction] profiles delete error", {
      message: deleteProfileError.message,
      code: deleteProfileError.code,
    });
  }

  const { error: deleteIndicatorError } = await supabase
    .from("indicadores")
    .delete()
    .eq("usuario_id", usuarioId);

  if (deleteIndicatorError) {
    console.error("[deleteUsuarioAction] indicadores delete error", {
      message: deleteIndicatorError.message,
      code: deleteIndicatorError.code,
    });
  }

  const { error: deleteGrantsError } = await supabase
    .from("user_permission_grants")
    .delete()
    .eq("usuario_id", usuarioId);

  if (deleteGrantsError) {
    console.error("[deleteUsuarioAction] user_permission_grants delete error", {
      message: deleteGrantsError.message,
      code: deleteGrantsError.code,
    });
  }

  revalidatePath("/configuracoes");
}
