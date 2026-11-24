import { describe, expect, it } from "vitest";
import {
  canRemoveIndividualPermission,
  classifyPermission,
  getGrantablePermissionsForPerfil,
  getRemovableGrantIds,
  hasPermissionForPerfil,
} from "./permission-rules";

describe("hasPermissionForPerfil", () => {
  it("Administrador tem acesso total", () => {
    expect(hasPermissionForPerfil("Administrador", "cobranca.ver")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "comissoes.ver_todas")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "playbooks.visualizar")).toBe(true);
  });

  it("Gestor acessa cobranças e comissões", () => {
    expect(hasPermissionForPerfil("Gestor", "cobranca.ver")).toBe(true);
    expect(hasPermissionForPerfil("Gestor", "comissoes.ver_proprias")).toBe(true);
    expect(hasPermissionForPerfil("Gestor", "comissoes.ver_todas")).toBe(true);
  });

  it("Consultor não acessa cobranças nem comissões", () => {
    expect(hasPermissionForPerfil("Consultor", "cobranca.ver")).toBe(false);
    expect(hasPermissionForPerfil("Consultor", "comissoes.ver_proprias")).toBe(false);
    expect(hasPermissionForPerfil("Consultor", "comissoes.ver_todas")).toBe(false);
  });

  it("Consultor mantém acesso operacional existente", () => {
    expect(hasPermissionForPerfil("Consultor", "playbooks.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "tarefas.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "reunioes.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "simulacoes.visualizar")).toBe(true);
  });

  it("Secretaria não acessa cobranças nem comissões", () => {
    expect(hasPermissionForPerfil("Secretaria", "cobranca.ver")).toBe(false);
    expect(hasPermissionForPerfil("Secretaria", "comissoes.ver_proprias")).toBe(false);
  });

  it("Indicador permanece restrito ao dashboard", () => {
    expect(hasPermissionForPerfil("Indicador", "dashboard.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "cobranca.ver")).toBe(false);
  });

  it("Indicador recebe playbooks sem herdar módulos de consultor", () => {
    expect(hasPermissionForPerfil("Indicador", "playbooks.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "leads.ver")).toBe(false);
    expect(hasPermissionForPerfil("Indicador", "clientes.ver")).toBe(false);
    expect(hasPermissionForPerfil("Indicador", "whatsapp.ver")).toBe(false);
  });

  it("aplica os limites esperados dos dez cargos", () => {
    const casos: Array<[string, string, boolean]> = [
      ["Administrador", "usuarios.promover_admin", true],
      ["Administrador", "clientes.ver", true],
      ["Gestor Pleno", "usuarios.criar", true],
      ["Gestor Pleno", "usuarios.promover_admin", false],
      ["Gestor", "usuarios.criar", false],
      ["Gestor", "clientes.ver", true],
      ["Consultor Pleno", "leads.ver", true],
      ["Consultor Pleno", "usuarios.criar", false],
      ["Consultor Pleno", "clientes.ver", false],
      ["Consultor", "leads.ver", true],
      ["Consultor", "clientes.ver", false],
      ["Consultor em prévia", "playbooks.visualizar", true],
      ["Consultor em prévia", "leads.ver", false],
      ["Líder em treinamento", "materiais.ver", true],
      ["Líder em treinamento", "leads.ver", false],
      ["Indicador", "playbooks.visualizar", true],
      ["Indicador", "clientes.ver", false],
      ["Trainee", "playbooks.visualizar", true],
      ["Trainee", "leads.ver", false],
      ["Secretaria", "leads.ver", true],
      ["Secretaria", "clientes.ver", false],
      ["Secretaria", "usuarios.criar", false],
    ];

    for (const [perfil, permission, expected] of casos) {
      expect(hasPermissionForPerfil(perfil, permission), `${perfil} -> ${permission}`).toBe(expected);
    }
  });

  it("Perfis não mapeados usam as permissões concedidas", () => {
    expect(hasPermissionForPerfil("Novo Perfil", "cobranca.ver", ["cobranca.ver"])).toBe(true);
    expect(hasPermissionForPerfil("Novo Perfil", "cobranca.ver")).toBe(false);
  });

  it("Permissão individual concedida libera módulo para Consultor", () => {
    expect(hasPermissionForPerfil("Consultor", "cobranca.ver", ["cobranca.ver"])).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "comissoes.ver_proprias", ["comissoes.ver_proprias"])).toBe(true);
  });

  it("Permissão individual não libera funções administrativas restritas", () => {
    expect(hasPermissionForPerfil("Consultor", "usuarios.excluir", ["usuarios.excluir"])).toBe(false);
    expect(hasPermissionForPerfil("Consultor", "usuarios.criar", ["usuarios.criar"])).toBe(false);
    expect(hasPermissionForPerfil("Secretaria", "usuarios.criar", ["usuarios.criar"])).toBe(false);
  });

  it("Gestor Pleno pode criar usuários; Gestor não", () => {
    expect(hasPermissionForPerfil("Gestor Pleno", "usuarios.criar")).toBe(true);
    expect(hasPermissionForPerfil("Gestor", "usuarios.criar")).toBe(false);
  });

  it("Reuniões: visualizar não implica criar nem editar", () => {
    const permissoes = ["reunioes.visualizar"];

    expect(hasPermissionForPerfil("Indicador", "reunioes.visualizar", permissoes)).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "reunioes.criar", permissoes)).toBe(false);
    expect(hasPermissionForPerfil("Indicador", "reunioes.editar", permissoes)).toBe(false);
  });

  it("Reuniões: visualizar e criar não implicam editar", () => {
    const permissoes = ["reunioes.visualizar", "reunioes.criar"];

    expect(hasPermissionForPerfil("Indicador", "reunioes.visualizar", permissoes)).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "reunioes.criar", permissoes)).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "reunioes.editar", permissoes)).toBe(false);
  });

  it("Tarefas: visualizar não implica criar nem editar", () => {
    const permissoes = ["tarefas.visualizar"];

    expect(hasPermissionForPerfil("Indicador", "tarefas.visualizar", permissoes)).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "tarefas.criar", permissoes)).toBe(false);
    expect(hasPermissionForPerfil("Indicador", "tarefas.editar", permissoes)).toBe(false);
  });

  it("Administrador mantém acesso total a reuniões e tarefas", () => {
    expect(hasPermissionForPerfil("Administrador", "reunioes.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "reunioes.criar")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "reunioes.editar")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "tarefas.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "tarefas.criar")).toBe(true);
    expect(hasPermissionForPerfil("Administrador", "tarefas.editar")).toBe(true);
  });

  it("usa os códigos canônicos .ver dos módulos legados", () => {
    expect(hasPermissionForPerfil("Consultor", "leads.ver")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "agenda.ver")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "pos_venda.ver")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "relatorios.ver")).toBe(true);
    expect(hasPermissionForPerfil("Consultor Pleno", "materiais.ver")).toBe(true);
  });

  it("mantém compatibilidade com os códigos .visualizar legados", () => {
    expect(hasPermissionForPerfil("Consultor", "leads.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "agenda.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "pos_venda.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor", "relatorios.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor Pleno", "materiais.visualizar")).toBe(true);
  });

  it("links úteis usa visualizar como canônico e aceita ver como legado", () => {
    expect(hasPermissionForPerfil("Consultor Pleno", "links_uteis.visualizar")).toBe(true);
    expect(hasPermissionForPerfil("Consultor Pleno", "links_uteis.ver")).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "links_uteis.visualizar")).toBe(false);
    expect(hasPermissionForPerfil("Indicador", "links_uteis.visualizar", ["links_uteis.ver"])).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "links_uteis.ver", ["links_uteis.ver"])).toBe(true);
  });

  it("permissões individuais usam o código canônico", () => {
    expect(hasPermissionForPerfil("Indicador", "agenda.ver", ["agenda.ver"])).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "agenda.visualizar", ["agenda.ver"])).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "agenda.ver", ["agenda.visualizar"])).toBe(true);
    expect(hasPermissionForPerfil("Indicador", "agenda.ver")).toBe(false);
  });

  it("Líder em treinamento mantém materiais mas não leads", () => {
    expect(hasPermissionForPerfil("Líder em treinamento", "materiais.ver")).toBe(true);
    expect(hasPermissionForPerfil("Líder em treinamento", "leads.ver")).toBe(false);
  });
});

const catalogoPermissoes = [
  { id: "p1", codigo: "dashboard.visualizar" },
  { id: "p2", codigo: "leads.ver" },
  { id: "p3", codigo: "cobranca.ver" },
  { id: "p4", codigo: "usuarios.excluir" },
  { id: "p5", codigo: "usuarios.criar" },
  { id: "p6", codigo: "links_uteis.visualizar" },
  { id: "p7", codigo: "links_uteis.ver" },
];

describe("getGrantablePermissionsForPerfil", () => {
  it("selecionar todas não concede permissões acima do cargo", () => {
    const codigos = getGrantablePermissionsForPerfil("Consultor", catalogoPermissoes).map((p) => p.codigo);

    expect(codigos).toContain("dashboard.visualizar");
    expect(codigos).toContain("leads.ver");
    expect(codigos).not.toContain("cobranca.ver");
    expect(codigos).not.toContain("usuarios.criar");
    expect(codigos).not.toContain("usuarios.excluir");
    expect(codigos).not.toContain("links_uteis.ver");
  });

  it("Indicador recebe apenas o padrão do cargo", () => {
    const codigos = getGrantablePermissionsForPerfil("Indicador", catalogoPermissoes).map((p) => p.codigo);

    expect(codigos).toEqual(["dashboard.visualizar"]);
  });

  it("Gestor recebe não restritas e nunca permissões administrativas", () => {
    const codigos = getGrantablePermissionsForPerfil("Gestor", catalogoPermissoes).map((p) => p.codigo);

    expect(codigos).toContain("cobranca.ver");
    expect(codigos).toContain("links_uteis.visualizar");
    expect(codigos).not.toContain("usuarios.criar");
    expect(codigos).not.toContain("usuarios.excluir");
    expect(codigos).not.toContain("links_uteis.ver");
  });

  it("Administrador recebe todas as não restritas sem duplicar legados", () => {
    const codigos = getGrantablePermissionsForPerfil("Administrador", catalogoPermissoes).map((p) => p.codigo);

    expect(codigos).toContain("cobranca.ver");
    expect(codigos).toContain("links_uteis.visualizar");
    expect(codigos).not.toContain("usuarios.excluir");
    expect(codigos).not.toContain("usuarios.criar");
    expect(codigos).not.toContain("links_uteis.ver");
  });

  it("não concede nada para perfil desconhecido", () => {
    expect(getGrantablePermissionsForPerfil("Novo Perfil", catalogoPermissoes)).toEqual([]);
  });
});

describe("canRemoveIndividualPermission", () => {
  it("protege permissões administrativas estruturais", () => {
    expect(canRemoveIndividualPermission("usuarios.promover_admin")).toBe(false);
    expect(canRemoveIndividualPermission("usuarios.permissoes")).toBe(false);
    expect(canRemoveIndividualPermission("configuracoes.editar")).toBe(false);
    expect(canRemoveIndividualPermission("metas.excluir")).toBe(false);
    expect(canRemoveIndividualPermission("usuarios.excluir")).toBe(false);
    expect(canRemoveIndividualPermission("usuarios.criar")).toBe(false);
  });

  it("permite remover permissões operacionais e aliases legados", () => {
    expect(canRemoveIndividualPermission("leads.ver")).toBe(true);
    expect(canRemoveIndividualPermission("cobranca.ver")).toBe(true);
    expect(canRemoveIndividualPermission("links_uteis.visualizar")).toBe(true);
    expect(canRemoveIndividualPermission("links_uteis.ver")).toBe(true);
  });
});

describe("getRemovableGrantIds", () => {
  it("remove operacionais e mantém protegidas ou desconhecidas", () => {
    const catalogo = new Map([
      ["p2", "leads.ver"],
      ["p4", "usuarios.excluir"],
      ["p5", "usuarios.criar"],
      ["p6", "links_uteis.ver"],
    ]);

    expect(getRemovableGrantIds(["p2", "p4", "p5", "p6", "p9"], catalogo)).toEqual(["p2", "p6"]);
  });
});

describe("classifyPermission", () => {
  it("protegida prevalece sobre concessão individual e cargo", () => {
    expect(classifyPermission("Administrador", "usuarios.promover_admin", ["usuarios.promover_admin"])).toBe("protegida");
    expect(classifyPermission("Consultor", "usuarios.criar", ["usuarios.criar"])).toBe("protegida");
    expect(classifyPermission("Gestor", "configuracoes.editar", [])).toBe("protegida");
  });

  it("concedida quando há grant individual mesmo fora do cargo", () => {
    expect(classifyPermission("Consultor", "cobranca.ver", ["cobranca.ver"])).toBe("concedida");
    expect(classifyPermission("Indicador", "agenda.ver", ["agenda.visualizar"])).toBe("concedida");
  });

  it("herdada quando decorre do cargo e não há grant", () => {
    expect(classifyPermission("Consultor", "leads.ver", [])).toBe("herdada");
    expect(classifyPermission("Consultor", "leads.ver", ["cobranca.ver"])).toBe("herdada");
    expect(classifyPermission("Gestor", "clientes.ver", [])).toBe("herdada");
    expect(classifyPermission("Trainee", "playbooks.visualizar", [])).toBe("herdada");
  });

  it("nao_concedida quando não é do cargo nem há grant", () => {
    expect(classifyPermission("Consultor", "cobranca.ver", [])).toBe("nao_concedida");
    expect(classifyPermission("Trainee", "leads.ver", [])).toBe("nao_concedida");
    expect(classifyPermission("Consultor", "leads.ver", ["cobranca.ver"])).toBe("herdada");
    expect(classifyPermission("Novo Perfil", "leads.ver", [])).toBe("nao_concedida");
  });

  it("concedida tem precedência sobre herdada", () => {
    expect(classifyPermission("Consultor", "leads.ver", ["leads.ver"])).toBe("concedida");
  });
});