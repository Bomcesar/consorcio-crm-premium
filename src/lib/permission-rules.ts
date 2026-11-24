const GLOBAL_RESTRICTED_PERMISSIONS = [
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

const GESTOR_PLENO_RESTRICTED_PERMISSIONS = GLOBAL_RESTRICTED_PERMISSIONS.filter(
  (permission) => permission !== "usuarios.criar",
);

const PERMISSION_ALIASES: Record<string, string> = {
  "leads.visualizar": "leads.ver",
  "agenda.visualizar": "agenda.ver",
  "pos_venda.visualizar": "pos_venda.ver",
  "materiais.visualizar": "materiais.ver",
  "relatorios.visualizar": "relatorios.ver",
  "links_uteis.ver": "links_uteis.visualizar",
};

function normalizePermission(permission: string): string {
  return PERMISSION_ALIASES[permission] ?? permission;
}

export const LEGACY_PERMISSION_CODES = new Set(Object.keys(PERMISSION_ALIASES));

export type PermissionDefinition = {
  id: string;
  codigo: string;
};

const ALLOWED_BY_PERFIL: Record<string, string[]> = {
  "Consultor Pleno": [
    "dashboard.visualizar",
    "indicadores.ver",
    "leads.ver", "leads.criar", "leads.editar",
    "agenda.ver", "agenda.criar", "agenda.editar",
    "tarefas.visualizar", "tarefas.criar", "tarefas.editar",
    "reunioes.visualizar", "reunioes.criar", "reunioes.editar",
    "simulacoes.visualizar", "simulacoes.criar", "simulacoes.editar",
    "mensagens.visualizar", "mensagens.criar", "mensagens.editar",
    "playbooks.visualizar", "playbooks.criar", "playbooks.editar",
    "credito_investimento.visualizar", "credito_investimento.criar", "credito_investimento.editar",
    "pos_venda.ver", "pos_venda.criar", "pos_venda.editar",
    "links_uteis.visualizar", "links_uteis.criar", "links_uteis.editar",
    "materiais.ver", "materiais.criar", "materiais.editar",
    "relatorios.ver",
  ],
  "Consultor": [
    "dashboard.visualizar",
    "indicadores.ver",
    "leads.ver", "leads.criar", "leads.editar",
    "agenda.ver", "agenda.criar", "agenda.editar",
    "tarefas.visualizar", "tarefas.criar", "tarefas.editar",
    "reunioes.visualizar", "reunioes.criar", "reunioes.editar",
    "simulacoes.visualizar", "simulacoes.criar", "simulacoes.editar",
    "mensagens.visualizar", "mensagens.criar", "mensagens.editar",
    "playbooks.visualizar",
    "credito_investimento.visualizar", "credito_investimento.criar", "credito_investimento.editar",
    "pos_venda.ver", "pos_venda.criar", "pos_venda.editar",
    "relatorios.ver",
  ],
  "Consultor em prévia": [
    "dashboard.visualizar",
    "playbooks.visualizar",
    "mensagens.visualizar",
  ],
  "Líder em treinamento": [
    "dashboard.visualizar",
    "playbooks.visualizar",
    "mensagens.visualizar",
    "materiais.ver",
  ],
  "Indicador": [
    "dashboard.visualizar",
    "indicadores.ver",
    "playbooks.visualizar",
  ],
  "Trainee": [
    "dashboard.visualizar",
    "playbooks.visualizar",
    "mensagens.visualizar",
  ],
  "Secretaria": [
    "dashboard.visualizar",
    "leads.ver", "leads.criar", "leads.editar",
    "agenda.ver", "agenda.criar", "agenda.editar",
    "tarefas.visualizar", "tarefas.criar", "tarefas.editar",
    "reunioes.visualizar", "reunioes.criar", "reunioes.editar",
    "simulacoes.visualizar", "simulacoes.criar", "simulacoes.editar",
    "mensagens.visualizar", "mensagens.criar", "mensagens.editar",
    "playbooks.visualizar",
    "credito_investimento.visualizar", "credito_investimento.criar", "credito_investimento.editar",
    "pos_venda.ver", "pos_venda.criar", "pos_venda.editar",
    "relatorios.ver",
  ],
};

function allowlistCheck(
  allowed: readonly string[],
  permission: string,
  permissoes: string[],
): boolean {
  if (allowed.includes(permission)) return true;
  if (GLOBAL_RESTRICTED_PERMISSIONS.includes(permission)) return false;
  return permissoes.includes(permission);
}

export function hasPermissionForPerfil(
  perfil: string | undefined,
  permission: string,
  permissoes: string[] = [],
): boolean {
  if (!perfil) return false;
  if (perfil === "Administrador") return true;

  const canonicalPermission = normalizePermission(permission);
  const normalizedGrants = permissoes.map(normalizePermission);

  if (perfil === "Gestor Pleno") {
    if (GESTOR_PLENO_RESTRICTED_PERMISSIONS.includes(canonicalPermission)) return false;
    return true;
  }

  if (perfil === "Gestor") {
    if (GLOBAL_RESTRICTED_PERMISSIONS.includes(canonicalPermission)) return false;
    return true;
  }

  const allowed = ALLOWED_BY_PERFIL[perfil];
  if (allowed) {
    return allowlistCheck(allowed, canonicalPermission, normalizedGrants);
  }

  return normalizedGrants.includes(canonicalPermission);
}

export function isPermissionInCargoDefaults(
  perfil: string | undefined,
  permission: string,
): boolean {
  if (!perfil) return false;
  const canonicalPermission = normalizePermission(permission);

  if (perfil === "Administrador") return true;
  if (perfil === "Gestor Pleno") {
    return !GESTOR_PLENO_RESTRICTED_PERMISSIONS.includes(canonicalPermission);
  }
  if (perfil === "Gestor") {
    return !GLOBAL_RESTRICTED_PERMISSIONS.includes(canonicalPermission);
  }

  return ALLOWED_BY_PERFIL[perfil]?.includes(canonicalPermission) ?? false;
}

export function getGrantablePermissionsForPerfil(
  perfil: string | undefined,
  permissions: PermissionDefinition[],
): PermissionDefinition[] {
  if (!perfil) return [];

  return permissions.filter((permission) => {
    if (LEGACY_PERMISSION_CODES.has(permission.codigo)) return false;

    const canonicalPermission = normalizePermission(permission.codigo);
    if (GLOBAL_RESTRICTED_PERMISSIONS.includes(canonicalPermission)) return false;

    return isPermissionInCargoDefaults(perfil, permission.codigo);
  });
}

export function canRemoveIndividualPermission(permission: string): boolean {
  return !GLOBAL_RESTRICTED_PERMISSIONS.includes(normalizePermission(permission));
}

export function getRemovableGrantIds(
  grantedIds: string[],
  permissionCodeById: ReadonlyMap<string, string>,
): string[] {
  return grantedIds.filter((permissionId) => {
    const codigo = permissionCodeById.get(permissionId);
    return codigo ? canRemoveIndividualPermission(codigo) : false;
  });
}

export type PermissionState =
  | "protegida"
  | "concedida"
  | "herdada"
  | "nao_concedida";

export function classifyPermission(
  perfil: string | undefined,
  permissionCodigo: string,
  grantedCodes: string[] = [],
): PermissionState {
  const canonical = normalizePermission(permissionCodigo);

  if (GLOBAL_RESTRICTED_PERMISSIONS.includes(canonical)) {
    return "protegida";
  }

  const granted = grantedCodes.map(normalizePermission).includes(canonical);
  if (granted) {
    return "concedida";
  }

  if (isPermissionInCargoDefaults(perfil, permissionCodigo)) {
    return "herdada";
  }

  return "nao_concedida";
}
