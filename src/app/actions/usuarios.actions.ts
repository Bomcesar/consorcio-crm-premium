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
 *
 * Fluxo de autorização:
 * 1. Identifica o chamador via createClient() (anon key + cookies).
 * 2. Valida que o chamador está autenticado e ativo.
 * 3. Valida permissões funcionais (hasPermission, canAssignProfile).
 * 4. Apenas então utiliza createAdminClient() (service_role) para operações privilegiadas.
 * 5. gestor_id NÃO é preenchido automaticamente com o ID do criador;
 *    somente será definido por operação administrativa explícita.
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
  // 1. Identificar chamador via cliente autenticado (anon key)
  const serverClient = await createClient();
  const { data: { user: authUser }, error: authError } = await serverClient.auth.getUser();

  if (authError || !authUser?.id) {
    throw new Error("Não autenticado. É necessário estar logado para criar usuários.");
  }

  // 2. Carregar perfil do chamador e validar ativo
  const { data: callerProfile, error: callerProfileError } = await serverClient
    .from("profiles")
    .select("perfil, ativo")
    .eq("id", authUser.id)
    .single();

  if (callerProfileError || !callerProfile) {
    console.error("[createUsuarioAction] perfil do caller não carregou:", {
      callerId: authUser.id,
      erro: callerProfileError?.message,
      codigo: callerProfileError?.code,
      detalhes: callerProfileError?.details,
    });
    throw new Error("Não foi possível carregar o perfil do usuário autenticado.");
  }

  if (!callerProfile.ativo) {
    throw new Error("Usuário inativo não pode criar novos usuários.");
  }

  const caller = {
    id: authUser.id,
    email: authUser.email,
    perfil: callerProfile.perfil as string | undefined,
    ativo: callerProfile.ativo,
    permissoes: [],
  };

  console.log("[createUsuarioAction] caller resolvido", {
    id: caller.id,
    perfil: caller.perfil,
    perfilAlvo: perfil,
  });

  // 3. Validações funcionais antes de qualquer operação privilegiada
  if (!hasPermission(caller, "usuarios.criar")) {
    throw new Error("Sem permissão para criar usuários. Apenas Administradores e Gestores podem criar usuários.");
  }

  if (!canAssignProfile(caller, perfil)) {
    throw new Error("Sem permissão para atribuir este perfil.");
  }

  // 4. Apenas então utilizar service_role para operações privilegiadas
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (adminErr) {
    console.error("[createUsuarioAction] createAdminClient error:", adminErr);
    throw new Error("Não foi possível inicializar o cliente de administrador. Verifique as variáveis de ambiente.");
  }

  // 5. Criar usuário no Auth (dispara trigger handle_new_user que cria perfil com 'Indicador')
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

  // 6. Atualizar perfil com o cargo autorizado (service_role, pre-validado pelo Server Action)
  // gestor_id NÃO é preenchido aqui; fica NULL para designação explícita posterior.
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

  // 7. Para perfil Indicador, criar registro em indicadores
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

  // 8. Registrar operação administrativa (audit log via console; tabela audit_log criada na migration)
  console.log("[createUsuarioAction] auditoria: criacao_usuario", {
    criado_por: caller.id,
    perfil_criador: caller.perfil,
    usuario_criado: data.user.id,
    perfil_atribuido: perfil,
    data_criacao: new Date().toISOString(),
  });

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
    .select("perfil, ativo")
    .eq("id", authUser.id)
    .single();

  if (callerProfileError || !callerProfile) {
    throw new Error("Não foi possível carregar o perfil do usuário autenticado.");
  }

  if (!callerProfile.ativo) {
    throw new Error("Usuário inativo não pode redefinir senhas.");
  }

  if (callerProfile.perfil !== "Administrador") {
    throw new Error("Sem permissão para redefinir senhas. Apenas Administradores podem redefinir senhas de usuários.");
  }

  // Validar que o usuário alvo existe e está ativo
  const { data: targetProfile, error: targetProfileError } = await serverClient
    .from("profiles")
    .select("perfil, ativo")
    .eq("id", usuarioId)
    .single();

  if (targetProfileError || !targetProfile) {
    throw new Error("Usuário alvo não encontrado.");
  }

  if (!targetProfile.ativo) {
    throw new Error("Não é possível redefinir senha de usuário inativo.");
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

  // Registrar auditoria
  console.log("[resetSenhaUsuarioAction] auditoria: redefinicao_senha", {
    executado_por: authUser.id,
    perfil_executor: callerProfile.perfil,
    usuario_afetado: usuarioId,
    data_execucao: new Date().toISOString(),
  });

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
    .select("perfil, ativo")
    .eq("id", authUser.id)
    .single();

  if (callerProfileError || !callerProfile) {
    throw new Error("Não foi possível carregar o perfil do usuário autenticado.");
  }

  if (!callerProfile.ativo) {
    throw new Error("Usuário inativo não pode excluir usuários.");
  }

  if (callerProfile.perfil !== "Administrador") {
    throw new Error("Sem permissão para excluir usuários. Apenas Administradores podem excluir usuários.");
  }

  // Não permitir autoexclusão
  if (authUser.id === usuarioId) {
    throw new Error("Não é possível excluir o próprio usuário.");
  }

  // Validar que o usuário alvo existe
  const { data: targetProfile, error: targetProfileError } = await serverClient
    .from("profiles")
    .select("perfil, ativo")
    .eq("id", usuarioId)
    .single();

  if (targetProfileError || !targetProfile) {
    throw new Error("Usuário alvo não encontrado.");
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

  // Registrar auditoria
  console.log("[deleteUsuarioAction] auditoria: exclusao_usuario", {
    executado_por: authUser.id,
    perfil_executor: callerProfile.perfil,
    usuario_excluido: usuarioId,
    perfil_excluido: targetProfile.perfil,
    data_execucao: new Date().toISOString(),
  });

  revalidatePath("/configuracoes");
}
