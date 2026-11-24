import { describe, expect, it } from "vitest";
import {
  classifyPermission,
  getGrantablePermissionsForPerfil,
  getRemovableGrantIds,
  hasPermissionForPerfil,
  type PermissionState,
} from "./permission-rules";
import { ROUTE_PERMISSIONS } from "./route-permissions";
import { ALL_NAV_ITEMS, getNavItemsForRole } from "@/config/navigation";
import { hasPermission } from "./auth-user";

const catalogo = [
  { id: "p1", codigo: "dashboard.visualizar" },
  { id: "p2", codigo: "leads.ver" },
  { id: "p3", codigo: "cobranca.ver" },
  { id: "p4", codigo: "usuarios.excluir" },
  { id: "p5", codigo: "usuarios.criar" },
  { id: "p6", codigo: "usuarios.promover_admin" },
  { id: "p7", codigo: "seguranca.global" },
  { id: "p8", codigo: "schema.alterar" },
  { id: "p9", codigo: "rls.alterar" },
  { id: "p10", codigo: "configuracoes.editar" },
  { id: "p11", codigo: "playbooks.visualizar" },
  { id: "p12", codigo: "indicadores.ver" },
  { id: "p13", codigo: "credito_investimento.visualizar" },
];

function mkUser(perfil: string, permissoes: string[] = []) {
  return { id: "u1", perfil, permissoes };
}

describe("1. Administrador mantém acesso total", () => {
  it("acessa qualquer rota e permissão", () => {
    for (const [href, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(hasPermissionForPerfil("Administrador", permission), `${href} -> ${permission}`).toBe(true);
      }
    }
    expect(hasPermissionForPerfil("Administrador", "usuarios.promover_admin")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "seguranca.global")).toBe(true);
  });

  it("classifica permissões administrativas como protegidas mesmo para Administrador", () => {
    const estado = classifyPermission("Administrador", "usuarios.promover_admin", []);
    expect(estado).toBe("protegida");
  });
});

describe("2. Consultor não recebe permissões administrativas restritas", () => {
  it("nenhuma permissão restrita é concedida por Selecionar todas", () => {
    const grantable = getGrantablePermissionsForPerfil("Consultor", catalogo).map((p) => p.codigo);
    expect(grantable).not.toContain("usuarios.criar");
    expect(grantable).not.toContain("usuarios.excluir");
    expect(grantable).not.toContain("usuarios.promover_admin");
    expect(grantable).not.toContain("seguranca.global");
    expect(grantable).not.toContain("schema.alterar");
    expect(grantable).not.toContain("rls.alterar");
  });

  it("concessão individual não eleva o cargo", () => {
    expect(hasPermissionForPerfil("Consultor", "usuarios.criar", ["usuarios.criar"])).toBe(false);
    expect(hasPermissionForPerfil("Consultor", "usuarios.promover_admin", ["usuarios.promover_admin"])).toBe(false);
  });
});

describe("3. Trainee não acessa rota apenas porque está marcada como Mostrar", () => {
  it("visibilidade não concede acesso à rota", () => {
    const visibleModules = new Set(ALL_NAV_ITEMS.map((item) => item.href));
    const navItems = getNavItemsForRole("Trainee", visibleModules);
    const navHrefs = navItems.map((item) => item.href);

    if (navHrefs.includes("/central-de-indicadores")) {
      expect(hasPermissionForPerfil("Trainee", "indicadores.ver")).toBe(false);
    }

    for (const [href, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
      const isVisible = navHrefs.includes(href);
      const canAccess = permissions.some((p) => hasPermissionForPerfil("Trainee", p));
      if (isVisible && !canAccess) {
        expect(hasPermission(mkUser("Trainee"), permissions[0]), `Trainee não deve acessar ${href}`).toBe(false);
      }
    }
  });

  it("Trainee só acessa rotas cujas permissões possui", () => {
    expect(hasPermissionForPerfil("Trainee", "dashboard.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Trainee", "playbooks.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Trainee", "leads.ver")).toBe(false);
    expect(hasPermissionForPerfil("Trainee", "indicadores.ver")).toBe(false);
  });
});

describe("4. Ocultar módulo remove sua entrada do menu", () => {
  it("getNavItemsForRole respeita visibilidade configurada", () => {
    const visibleModules = new Set(["/", "/leads"]);
    const items = getNavItemsForRole("Consultor", visibleModules);
    const hrefs = items.map((item) => item.href);

    expect(hrefs).toContain("/leads");
    expect(hrefs).not.toContain("/contatos");
    expect(hrefs).not.toContain("/clientes");
  });

  it("Administrador ignora visibilidade e mantém todos os módulos", () => {
    const items = getNavItemsForRole("Administrador", new Set(["/"]));
    expect(items.map((item) => item.href)).toEqual(ALL_NAV_ITEMS.map((item) => item.href));
  });
});

describe("5. Permissões herdadas continuam funcionando sem concessão individual", () => {
  it("Consultor acessa leads.ver sem grant", () => {
    expect(hasPermissionForPerfil("Consultor", "leads.ver", [])).toBe(true);
    expect(classifyPermission("Consultor", "leads.ver", [])).toBe("herdada");
  });

  it("Gestor acessa clientes.ver sem grant", () => {
    expect(hasPermissionForPerfil("Gestor", "clientes.ver", [])).toBe(true);
    expect(classifyPermission("Gestor", "clientes.ver", [])).toBe("herdada");
  });
});

describe("6. Concessões individuais são carregadas exclusivamente do usuário selecionado", () => {
  it("classifyPermission isola grants por usuário", () => {
    const grantsUsuarioA = ["cobranca.ver"];
    const grantsUsuarioB = ["leads.ver"];

    expect(classifyPermission("Consultor", "cobranca.ver", grantsUsuarioA)).toBe("concedida");
    expect(classifyPermission("Consultor", "cobranca.ver", grantsUsuarioB)).toBe("nao_concedida");
    expect(classifyPermission("Consultor", "leads.ver", grantsUsuarioA)).toBe("herdada");
    expect(classifyPermission("Consultor", "leads.ver", grantsUsuarioB)).toBe("concedida");
  });
});

describe("7. Selecionar todas respeita a lista permitida para o cargo", () => {
  it("apenas inclui permissões grantable e não restritas", () => {
    for (const perfil of ["Consultor", "Consultor Pleno", "Indicador", "Trainee", "Secretaria"]) {
      const grantable = getGrantablePermissionsForPerfil(perfil, catalogo);
      for (const permissao of grantable) {
        expect(
          hasPermissionForPerfil(perfil, permissao.codigo),
          `${perfil} deve poder receber ${permissao.codigo} via grant`,
        ).toBe(true);
      }
    }
  });

  it("não concede permissões protegidas", () => {
    const protegidas = ["usuarios.criar", "usuarios.excluir", "usuarios.promover_admin", "seguranca.global", "schema.alterar", "rls.alterar"];
    for (const perfil of ["Consultor", "Consultor Pleno", "Indicador", "Trainee", "Secretaria"]) {
      const codigos = getGrantablePermissionsForPerfil(perfil, catalogo).map((p) => p.codigo);
      for (const codigo of protegidas) {
        expect(codigos, `${perfil} não deve receber ${codigo}`).not.toContain(codigo);
      }
    }
  });
});

describe("8. Limpar todas preserva permissões protegidas e herdadas", () => {
  it("getRemovableGrantIds mantém protegidas", () => {
    const catalogoMap = new Map(catalogo.map((p) => [p.id, p.codigo]));
    const grants = ["p2", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];
    const removable = getRemovableGrantIds(grants, catalogoMap);

    expect(removable).toEqual(["p2"]);
    expect(removable).not.toContain("p4");
    expect(removable).not.toContain("p5");
    expect(removable).not.toContain("p6");
    expect(removable).not.toContain("p7");
    expect(removable).not.toContain("p8");
    expect(removable).not.toContain("p9");
    expect(removable).not.toContain("p10");
  });

  it("herdadas permanecem após limpar grants", () => {
    const grantsAposLimpar: string[] = [];
    expect(hasPermissionForPerfil("Consultor", "leads.ver", grantsAposLimpar)).toBe(true);
    expect(classifyPermission("Consultor", "leads.ver", grantsAposLimpar)).toBe("herdada");
  });
});

describe("9/10. Estados da interface refletem apenas gravação bem-sucedida", () => {
  it("classifyPermission não marca concedida sem grant", () => {
    const estado = classifyPermission("Consultor", "cobranca.ver", []);
    expect(estado).toBe("nao_concedida");
    expect(estado).not.toBe("concedida");
  });

  it("estados possíveis são limitados e consistentes", () => {
    const estados: PermissionState[] = [
      classifyPermission("Administrador", "usuarios.promover_admin", []),
      classifyPermission("Consultor", "leads.ver", []),
      classifyPermission("Consultor", "cobranca.ver", ["cobranca.ver"]),
      classifyPermission("Consultor", "cobranca.ver", []),
    ];
    expect(new Set(estados)).toEqual(new Set(["protegida", "herdada", "concedida", "nao_concedida"]));
  });
});