"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Perfil } from "@/types/database.types";
import type { Usuario } from "@/repositories/client/usuarios.repository";
import { hasPermission, canAssignProfile } from "@/lib/auth-user";

/**
 * Cria um usuário e, para o perfil Indicador, o registro em `indicadores`.
 *
 * Este arquivo é uma Server Action. Uma exceção aqui vira HTTP 500 e, em
 * build de produção, o Next substitui a mensagem por um texto genérico com
 * um `digest` — o detalhe real só aparece no log do servidor. Por isso
 * todo erro é registrado aqui antes de repropagar.
 */
export async function createUsuarioAction(
  email: string,
  password: string,
  nome: string,
  perfil: Perfil
): Promise<Usuario> {
  try {
    return await criarUsuario(email, password, nome, perfil);
  } catch (erro) {
    console.error("[createUsuarioAction] falhou:", {
      perfil,
      email,
      mensagem: erro instanceof Error ? erro.message : String(erro),
      stack: erro instanceof Error ? erro.stack : undefined,
    });
    throw erro;
  }
}

async function criarUsuario(
  email: string,
  password: string,
  nome: string,
  perfil: Perfil
): Promise<Usuario> {
  const serverClient = await createClient();
  const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser();

  if (authError || !authUser?.id) {
    throw new Error("Não autenticado. É necessário estar logado para criar usuários.");
  }

  const { data: callerProfile, error: callerProfileError } = await serverClient
    .from("profiles")
    .select("perfil")
    .eq("id", authUser.id)
    .single();

  if (callerProfileError || !callerProfile) {
    // Sem este log, um simples "perfil não encontrado" chega ao usuário
    // como erro genérico de Server Components, indistinguível de uma
    // falha de infraestrutura.
    console.error("[createUsuarioAction] perfil do caller não carregou:", {
      callerId: authUser.id,
      erro: callerProfileError?.message,
      codigo: callerProfileError?.code,
      detalhes: callerProfileError?.details,
    });
    throw new Error("Não foi possível carregar o perfil do usuário autenticado.");
  }

  const caller = {
    id: authUser.id,
    email: authUser.email,
    perfil: callerProfile.perfil as string | undefined,
    permissoes: [],
  };

  console.log("[createUsuarioAction] caller resolvido", {
    id: caller.id,
    perfil: caller.perfil,
    perfilAlvo: perfil,
  });

  if (!hasPermission(caller, "usuarios.criar")) {
    throw new Error("Sem permissão para criar usuários. Apenas Administradores e Gestores podem criar usuários.");
  }

  if (!canAssignProfile(caller, perfil)) {
    throw new Error("Sem permissão para atribuir este perfil. Gestores não podem criar usuários como Administrador ou Gestor.");
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (adminErr) {
    console.error("[createUsuarioAction] createAdminClient error:", adminErr);
    throw new Error("Não foi possível inicializar o cliente de administrador. Verifique as variáveis de ambiente.");
  }

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
    throw new Error(`Não foi possível criar o usuário: ${error.message || "Erro no Supabase Auth"}`);
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
      details: profileError.details,
      hint: profileError.hint,
    });
    await supabase.auth.admin.deleteUser(data.user.id);
    throw new Error(`Não foi possível criar o perfil do usuário: ${profileError.message || "Erro desconhecido"}`);
  }

  console.log("[createUsuarioAction] profile criado/atualizado", { userId: data.user.id });

  if (perfil === "Indicador") {
    try {
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
          details: indicadorError.details,
          hint: indicadorError.hint,
        });
        throw new Error(`Não foi possível criar o registro de indicador: ${indicadorError.message || "Verifique se a migration de indicadores foi aplicada."}`);
      }

      console.log("[createUsuarioAction] indicador criado", { userId: data.user.id });
    } catch (indErr) {
      await supabase.auth.admin.deleteUser(data.user.id);
      await supabase.from("profiles").delete().eq("id", data.user.id);
      throw indErr instanceof Error ? indErr : new Error("Erro desconhecido ao criar indicador.");
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
  const serverClient = await createClient();
  const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser();

  if (authError || !authUser?.id) {
    throw new Error("Não autenticado.");
  }

  const { data: callerProfile, error: callerProfileError } = await serverClient
    .from("profiles")
    .select("perfil")
    .eq("id", authUser.id)
    .single();

  if (callerProfileError || !callerProfile) {
    throw new Error("Não foi possível carregar o perfil do usuário autenticado.");
  }

  if (callerProfile.perfil !== "Administrador") {
    throw new Error("Sem permissão para redefinir senhas. Apenas Administradores podem redefinir senhas de usuários.");
  }

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
  const serverClient = await createClient();
  const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser();

  if (authError || !authUser?.id) {
    throw new Error("Não autenticado.");
  }

  const { data: callerProfile, error: callerProfileError } = await serverClient
    .from("profiles")
    .select("perfil")
    .eq("id", authUser.id)
    .single();

  if (callerProfileError || !callerProfile) {
    throw new Error("Não foi possível carregar o perfil do usuário autenticado.");
  }

  if (callerProfile.perfil !== "Administrador") {
    throw new Error("Sem permissão para excluir usuários. Apenas Administradores podem excluir usuários.");
  }

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
