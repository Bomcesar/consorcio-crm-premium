export type UserRole =
  | "Administrador"
  | "Gestor"
  | "Consultor"
  | "Trainee"
  | "Secretaria"
  | "Indicador";

export type AppPermission =
  | "dashboard.view"
  | "leads.manage"
  | "clientes.manage"
  | "indicadores.manage"
  | "agenda.manage"
  | "whatsapp.manage"
  | "relatorios.view"
  | "comissoes.manage"
  | "usuarios.manage";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthProfile = {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  avatar_url: string | null;
};

export type AuthState = {
  user: AuthUser;
  profile: AuthProfile;
};
