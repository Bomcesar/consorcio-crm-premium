export function hasPermissionForPerfil(
  perfil: string | undefined,
  permission: string,
  permissoes: string[] = [],
): boolean {
  if (!perfil) return false;

  if (perfil === "Administrador") return true;

  if (perfil === "Gestor Pleno") {
    const restrictedPermissions = [
      "usuarios.excluir",
      "usuarios.permissoes",
      "configuracoes.editar",
      "metas.excluir",
      "usuarios.promover_admin",
      "usuarios.alterar_gestor",
      "seguranca.global",
      "schema.alterar",
      "rls.alterar",
    ];
    if (restrictedPermissions.includes(permission)) return false;
    return true;
  }

  if (perfil === "Gestor") {
    const restrictedPermissions = [
      "usuarios.excluir",
      "usuarios.permissoes",
      "configuracoes.editar",
      "metas.excluir",
      "usuarios.promover_admin",
      "usuarios.alterar_gestor",
      "seguranca.global",
      "schema.alterar",
      "rls.alterar",
      "usuarios.criar",
    ];
    if (restrictedPermissions.includes(permission)) return false;
    return true;
  }

  if (perfil === "Consultor Pleno") {
    const allowedPermissions = [
      "dashboard.visualizar",
      "leads.visualizar", "leads.criar", "leads.editar",
      "agenda.visualizar", "agenda.criar", "agenda.editar",
      "tarefas.visualizar", "tarefas.criar", "tarefas.editar",
      "reunioes.visualizar", "reunioes.criar", "reunioes.editar",
      "simulacoes.visualizar", "simulacoes.criar", "simulacoes.editar",
      "mensagens.visualizar", "mensagens.criar", "mensagens.editar",
      "playbooks.visualizar", "playbooks.criar", "playbooks.editar",
      "credito_investimento.visualizar", "credito_investimento.criar", "credito_investimento.editar",
      "pos_venda.visualizar", "pos_venda.criar", "pos_venda.editar",
      "links_uteis.visualizar", "links_uteis.criar", "links_uteis.editar",
      "materiais.visualizar", "materiais.criar", "materiais.editar",
      "relatorios.visualizar",
      "usuarios.criar",
    ];
    return allowedPermissions.includes(permission);
  }

  if (perfil === "Consultor") {
    const allowedPermissions = [
      "dashboard.visualizar",
      "leads.visualizar", "leads.criar", "leads.editar",
      "agenda.visualizar", "agenda.criar", "agenda.editar",
      "tarefas.visualizar", "tarefas.criar", "tarefas.editar",
      "reunioes.visualizar", "reunioes.criar", "reunioes.editar",
      "simulacoes.visualizar", "simulacoes.criar", "simulacoes.editar",
      "mensagens.visualizar", "mensagens.criar", "mensagens.editar",
      "playbooks.visualizar",
      "credito_investimento.visualizar", "credito_investimento.criar", "credito_investimento.editar",
      "pos_venda.visualizar", "pos_venda.criar", "pos_venda.editar",
      "relatorios.visualizar",
    ];
    return allowedPermissions.includes(permission);
  }

  if (perfil === "Consultor em prévia") {
    const allowedPermissions = [
      "dashboard.visualizar",
      "playbooks.visualizar",
      "mensagens.visualizar",
    ];
    return allowedPermissions.includes(permission);
  }

  if (perfil === "Líder em treinamento") {
    const allowedPermissions = [
      "dashboard.visualizar",
      "playbooks.visualizar",
      "mensagens.visualizar",
      "materiais.visualizar",
    ];
    return allowedPermissions.includes(permission);
  }

  if (perfil === "Indicador") {
    return permission === "dashboard.visualizar";
  }

  if (perfil === "Trainee") {
    const allowedPermissions = [
      "dashboard.visualizar",
      "playbooks.visualizar",
      "mensagens.visualizar",
    ];
    return allowedPermissions.includes(permission);
  }

  if (perfil === "Secretaria") {
    const allowedPermissions = [
      "dashboard.visualizar",
      "leads.visualizar", "leads.criar", "leads.editar",
      "agenda.visualizar", "agenda.criar", "agenda.editar",
      "tarefas.visualizar", "tarefas.criar", "tarefas.editar",
      "reunioes.visualizar", "reunioes.criar", "reunioes.editar",
      "simulacoes.visualizar", "simulacoes.criar", "simulacoes.editar",
      "mensagens.visualizar", "mensagens.criar", "mensagens.editar",
      "playbooks.visualizar",
      "credito_investimento.visualizar", "credito_investimento.criar", "credito_investimento.editar",
      "pos_venda.visualizar", "pos_venda.criar", "pos_venda.editar",
      "relatorios.visualizar",
    ];
    return allowedPermissions.includes(permission);
  }

  return permissoes.includes(permission);
}