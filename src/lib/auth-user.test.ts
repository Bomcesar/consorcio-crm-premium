import { describe, it, expect } from "vitest";
import {
  canCreateUser,
  canAssignProfile,
  hasPermission,
  getUserRoleRank,
  canViewUserProfile,
  canEditUserProfile,
  canChangeGestor,
  canPromoteUser,
  canManageTeam,
  canGrantPermission,
  type AuthenticatedUser,
} from "@/lib/auth-user";

const mkUser = (perfil?: string, id = "caller-1"): AuthenticatedUser => ({
  id,
  perfil,
});

describe("canCreateUser - matriz oficial de 10 cargos", () => {
  it("Administrador pode criar todos os cargos", () => {
    const admin = mkUser("Administrador");
    const cargos = [
      "Administrador",
      "Gestor Pleno",
      "Gestor",
      "Consultor Pleno",
      "Consultor",
      "Consultor em prévia",
      "Líder em treinamento",
      "Indicador",
      "Trainee",
      "Secretaria",
    ];
    for (const c of cargos) {
      expect(canCreateUser(admin, c)).toBe(true);
    }
  });

  it("Gestor Pleno pode criar: Gestor, Consultor Pleno, Consultor, Consultor em prévia, Líder em treinamento, Indicador", () => {
    const gp = mkUser("Gestor Pleno");
    expect(canCreateUser(gp, "Gestor")).toBe(true);
    expect(canCreateUser(gp, "Consultor Pleno")).toBe(true);
    expect(canCreateUser(gp, "Consultor")).toBe(true);
    expect(canCreateUser(gp, "Consultor em prévia")).toBe(true);
    expect(canCreateUser(gp, "Líder em treinamento")).toBe(true);
    expect(canCreateUser(gp, "Indicador")).toBe(true);
    // Não pode criar Administrador, Gestor Pleno, Trainee, Secretaria
    expect(canCreateUser(gp, "Administrador")).toBe(false);
    expect(canCreateUser(gp, "Gestor Pleno")).toBe(false);
    expect(canCreateUser(gp, "Trainee")).toBe(false);
    expect(canCreateUser(gp, "Secretaria")).toBe(false);
  });

  it("Gestor pode criar: Consultor, Consultor em prévia, Líder em treinamento, Indicador", () => {
    const g = mkUser("Gestor");
    expect(canCreateUser(g, "Consultor")).toBe(true);
    expect(canCreateUser(g, "Consultor em prévia")).toBe(true);
    expect(canCreateUser(g, "Líder em treinamento")).toBe(true);
    expect(canCreateUser(g, "Indicador")).toBe(true);
    // Não pode criar Administrador, Gestor Pleno, Gestor, Consultor Pleno, Trainee, Secretaria
    expect(canCreateUser(g, "Administrador")).toBe(false);
    expect(canCreateUser(g, "Gestor Pleno")).toBe(false);
    expect(canCreateUser(g, "Gestor")).toBe(false);
    expect(canCreateUser(g, "Consultor Pleno")).toBe(false);
    expect(canCreateUser(g, "Trainee")).toBe(false);
    expect(canCreateUser(g, "Secretaria")).toBe(false);
  });

  it("Consultor Pleno não pode criar usuários", () => {
    const cp = mkUser("Consultor Pleno");
    expect(canCreateUser(cp, "Consultor")).toBe(false);
    expect(canCreateUser(cp, "Consultor em prévia")).toBe(false);
    expect(canCreateUser(cp, "Indicador")).toBe(false);
    expect(canCreateUser(cp, "Administrador")).toBe(false);
    expect(canCreateUser(cp, "Gestor Pleno")).toBe(false);
    expect(canCreateUser(cp, "Gestor")).toBe(false);
    expect(canCreateUser(cp, "Líder em treinamento")).toBe(false);
    expect(canCreateUser(cp, "Trainee")).toBe(false);
    expect(canCreateUser(cp, "Secretaria")).toBe(false);
  });

  it("Consultor não pode criar nenhum usuário", () => {
    const c = mkUser("Consultor");
    expect(canCreateUser(c, "Consultor")).toBe(false);
    expect(canCreateUser(c, "Indicador")).toBe(false);
  });

  it("Consultor em prévia não pode criar nenhum usuário", () => {
    const c = mkUser("Consultor em prévia");
    expect(canCreateUser(c, "Consultor")).toBe(false);
  });

  it("Líder em treinamento não pode criar nenhum usuário", () => {
    const l = mkUser("Líder em treinamento");
    expect(canCreateUser(l, "Consultor")).toBe(false);
  });

  it("Indicador não pode criar nenhum usuário", () => {
    const i = mkUser("Indicador");
    expect(canCreateUser(i, "Consultor")).toBe(false);
  });

  it("Trainee não pode criar nenhum usuário", () => {
    const t = mkUser("Trainee");
    expect(canCreateUser(t, "Consultor")).toBe(false);
  });

  it("Secretaria não pode criar nenhum usuário", () => {
    const s = mkUser("Secretaria");
    expect(canCreateUser(s, "Consultor")).toBe(false);
  });

  it("usuário sem perfil não pode criar", () => {
    const u = mkUser(undefined);
    expect(canCreateUser(u, "Consultor")).toBe(false);
  });

  it("canPromoteUser segue as mesmas regras de canCreateUser", () => {
    const gp = mkUser("Gestor Pleno");
    expect(canPromoteUser(gp, "Consultor")).toBe(true);
    expect(canPromoteUser(gp, "Administrador")).toBe(false);
    const c = mkUser("Consultor");
    expect(canPromoteUser(c, "Consultor")).toBe(false);
  });
});

describe("canAssignProfile - matriz oficial de atribuição", () => {
  it("Administrador pode atribuir qualquer perfil", () => {
    const admin = mkUser("Administrador");
    expect(canAssignProfile(admin, "Secretaria")).toBe(true);
    expect(canAssignProfile(admin, "Administrador")).toBe(true);
  });

  it("Gestor Pleno pode atribuir: Gestor, Consultor Pleno, Consultor, Consultor em prévia, Líder em treinamento, Indicador", () => {
    const gp = mkUser("Gestor Pleno");
    expect(canAssignProfile(gp, "Gestor")).toBe(true);
    expect(canAssignProfile(gp, "Consultor Pleno")).toBe(true);
    expect(canAssignProfile(gp, "Consultor")).toBe(true);
    expect(canAssignProfile(gp, "Consultor em prévia")).toBe(true);
    expect(canAssignProfile(gp, "Líder em treinamento")).toBe(true);
    expect(canAssignProfile(gp, "Indicador")).toBe(true);
    expect(canAssignProfile(gp, "Administrador")).toBe(false);
    expect(canAssignProfile(gp, "Gestor Pleno")).toBe(false);
  });

  it("Gestor pode atribuir: Consultor, Consultor em prévia, Líder em treinamento, Indicador", () => {
    const g = mkUser("Gestor");
    expect(canAssignProfile(g, "Consultor")).toBe(true);
    expect(canAssignProfile(g, "Consultor em prévia")).toBe(true);
    expect(canAssignProfile(g, "Líder em treinamento")).toBe(true);
    expect(canAssignProfile(g, "Indicador")).toBe(true);
    expect(canAssignProfile(g, "Gestor Pleno")).toBe(false);
    expect(canAssignProfile(g, "Gestor")).toBe(false);
  });

  it("Consultor Pleno não pode atribuir perfis", () => {
    const cp = mkUser("Consultor Pleno");
    expect(canAssignProfile(cp, "Consultor")).toBe(false);
    expect(canAssignProfile(cp, "Consultor em prévia")).toBe(false);
    expect(canAssignProfile(cp, "Indicador")).toBe(false);
    expect(canAssignProfile(cp, "Líder em treinamento")).toBe(false);
    expect(canAssignProfile(cp, "Consultor Pleno")).toBe(false);
  });

  it("Outros perfis não podem atribuir nenhum perfil", () => {
    const c = mkUser("Consultor");
    expect(canAssignProfile(c, "Consultor")).toBe(false);
    const i = mkUser("Indicador");
    expect(canAssignProfile(i, "Indicador")).toBe(false);
  });

  it("sem perfil não pode atribuir", () => {
    const u = mkUser(undefined);
    expect(canAssignProfile(u, "Consultor")).toBe(false);
  });
});

describe("hasPermission - verificações de permissão", () => {
  it("Administrador tem todas as permissões", () => {
    const admin = mkUser("Administrador");
    expect(hasPermission(admin, "usuarios.criar")).toBe(true);
    expect(hasPermission(admin, "usuarios.excluir")).toBe(true);
    expect(hasPermission(admin, "configuracoes.editar")).toBe(true);
    expect(hasPermission(admin, "seguranca.global")).toBe(true);
  });

  it("Gestor Pleno não tem permissões restritas", () => {
    const gp = mkUser("Gestor Pleno");
    expect(hasPermission(gp, "usuarios.excluir")).toBe(false);
    expect(hasPermission(gp, "usuarios.permissoes")).toBe(false);
    expect(hasPermission(gp, "configuracoes.editar")).toBe(false);
    expect(hasPermission(gp, "seguranca.global")).toBe(false);
    expect(hasPermission(gp, "usuarios.promover_admin")).toBe(false);
    expect(hasPermission(gp, "usuarios.alterar_gestor")).toBe(false);
    // Mas tem permissões operacionais
    expect(hasPermission(gp, "dashboard.visualizar")).toBe(true);
  });

  it("Gestor não tem usuarios.criar", () => {
    const g = mkUser("Gestor");
    expect(hasPermission(g, "usuarios.criar")).toBe(false);
    expect(hasPermission(g, "usuarios.excluir")).toBe(false);
  });

  it("Consultor Pleno não tem usuarios.criar", () => {
    const cp = mkUser("Consultor Pleno");
    expect(hasPermission(cp, "usuarios.criar")).toBe(false);
    expect(hasPermission(cp, "usuarios.excluir")).toBe(false);
    expect(hasPermission(cp, "configuracoes.editar")).toBe(false);
  });

  it("Consultor não tem usuarios.criar", () => {
    const c = mkUser("Consultor");
    expect(hasPermission(c, "usuarios.criar")).toBe(false);
  });

  it("sem perfil não tem nenhuma permissão", () => {
    const u = mkUser(undefined);
    expect(hasPermission(u, "dashboard.visualizar")).toBe(false);
  });
});

describe("getUserRoleRank - hierarquia de cargos", () => {
  it("retorna ranks corretos", () => {
    expect(getUserRoleRank({ perfil: "Administrador" })).toBe(100);
    expect(getUserRoleRank({ perfil: "Gestor Pleno" })).toBe(95);
    expect(getUserRoleRank({ perfil: "Gestor" })).toBe(90);
    expect(getUserRoleRank({ perfil: "Consultor Pleno" })).toBe(80);
    expect(getUserRoleRank({ perfil: "Consultor" })).toBe(70);
    expect(getUserRoleRank({ perfil: "Consultor em prévia" })).toBe(60);
    expect(getUserRoleRank({ perfil: "Líder em treinamento" })).toBe(50);
    expect(getUserRoleRank({ perfil: "Indicador" })).toBe(40);
    expect(getUserRoleRank({ perfil: "Trainee" })).toBe(60);
    expect(getUserRoleRank({ perfil: "Secretaria" })).toBe(55);
    expect(getUserRoleRank({ perfil: undefined })).toBe(0);
  });
});

describe("canViewUserProfile", () => {
  it("Administrador pode ver todos", () => {
    const admin = mkUser("Administrador");
    expect(canViewUserProfile(admin, { perfil: "Administrador", id: "outro" })).toBe(true);
    expect(canViewUserProfile(admin, { perfil: "Consultor", id: "outro" })).toBe(true);
  });

  it("Gestor Pleno pode ver todos exceto Administrador", () => {
    const gp = mkUser("Gestor Pleno");
    expect(canViewUserProfile(gp, { perfil: "Consultor", id: "outro" })).toBe(true);
    expect(canViewUserProfile(gp, { perfil: "Administrador", id: "outro" })).toBe(false);
  });

  it("Gestor não pode ver Administrador nem Gestor Pleno", () => {
    const g = mkUser("Gestor");
    expect(canViewUserProfile(g, { perfil: "Consultor", id: "outro" })).toBe(true);
    expect(canViewUserProfile(g, { perfil: "Administrador", id: "outro" })).toBe(false);
    expect(canViewUserProfile(g, { perfil: "Gestor Pleno", id: "outro" })).toBe(false);
  });

  it("sem perfil não pode ver", () => {
    const u = mkUser(undefined);
    expect(canViewUserProfile(u, { perfil: "Consultor", id: "outro" })).toBe(false);
  });
});

describe("canEditUserProfile", () => {
  it("Administrador pode editar qualquer perfil", () => {
    const admin = mkUser("Administrador");
    expect(canEditUserProfile(admin, { perfil: "Administrador", id: "outro" })).toBe(true);
  });

  it("Gestor Pleno não pode editar Administrador nem a si mesmo", () => {
    const gp = mkUser("Gestor Pleno", "gp-1");
    expect(canEditUserProfile(gp, { perfil: "Administrador", id: "outro" })).toBe(false);
    expect(canEditUserProfile(gp, { perfil: "Consultor", id: "gp-1" })).toBe(false);
    expect(canEditUserProfile(gp, { perfil: "Consultor", id: "outro" })).toBe(true);
  });

  it("Gestor não pode editar Administrador, Gestor Pleno, Gestor, nem a si mesmo", () => {
    const g = mkUser("Gestor", "g-1");
    expect(canEditUserProfile(g, { perfil: "Administrador", id: "outro" })).toBe(false);
    expect(canEditUserProfile(g, { perfil: "Gestor Pleno", id: "outro" })).toBe(false);
    expect(canEditUserProfile(g, { perfil: "Gestor", id: "outro" })).toBe(false);
    expect(canEditUserProfile(g, { perfil: "Consultor", id: "g-1" })).toBe(false);
    expect(canEditUserProfile(g, { perfil: "Consultor", id: "outro" })).toBe(true);
  });

  it("Consultor Pleno não pode editar ninguém", () => {
    const cp = mkUser("Consultor Pleno");
    expect(canEditUserProfile(cp, { perfil: "Consultor", id: "outro" })).toBe(false);
  });

  it("sem perfil não pode editar", () => {
    const u = mkUser(undefined);
    expect(canEditUserProfile(u, { perfil: "Consultor", id: "outro" })).toBe(false);
  });
});

describe("canChangeGestor", () => {
  it("Administrador, Gestor Pleno e Gestor podem alterar gestor", () => {
    expect(canChangeGestor(mkUser("Administrador"))).toBe(true);
    expect(canChangeGestor(mkUser("Gestor Pleno"))).toBe(true);
    expect(canChangeGestor(mkUser("Gestor"))).toBe(true);
  });

  it("outros perfis não podem alterar gestor", () => {
    expect(canChangeGestor(mkUser("Consultor Pleno"))).toBe(false);
    expect(canChangeGestor(mkUser("Consultor"))).toBe(false);
    expect(canChangeGestor(mkUser(undefined))).toBe(false);
  });
});

describe("canManageTeam", () => {
  it("apenas Administrador, Gestor Pleno e Gestor podem gerenciar equipe", () => {
    expect(canManageTeam(mkUser("Administrador"))).toBe(true);
    expect(canManageTeam(mkUser("Gestor Pleno"))).toBe(true);
    expect(canManageTeam(mkUser("Gestor"))).toBe(true);
    expect(canManageTeam(mkUser("Consultor Pleno"))).toBe(false);
    expect(canManageTeam(mkUser(undefined))).toBe(false);
  });
});

describe("canGrantPermission", () => {
  it("apenas Administrador pode conceder permissões", () => {
    expect(canGrantPermission(mkUser("Administrador"), "usuarios.permissoes")).toBe(true);
    expect(canGrantPermission(mkUser("Gestor Pleno"), "usuarios.permissoes")).toBe(false);
    expect(canGrantPermission(mkUser("Gestor"), "usuarios.permissoes")).toBe(false);
    expect(canGrantPermission(mkUser(undefined), "usuarios.permissoes")).toBe(false);
  });
});
