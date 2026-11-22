import { describe, expect, it } from "vitest";
import { ALL_NAV_ITEMS, PERFIS_VISIBILIDADE, getNavItemsForRole } from "./navigation";

function hrefs(items: ReturnType<typeof getNavItemsForRole>): string[] {
  return items.map((item) => item.href);
}

describe("getNavItemsForRole", () => {
  it("mantém Configurações para Administrador mesmo sem registro de visibilidade", () => {
    const items = getNavItemsForRole("Administrador", new Set(["/", "/leads"]));
    expect(hrefs(items)).toContain("/configuracoes");
  });

  it("não concede Configurações a Gestor", () => {
    const items = getNavItemsForRole("Gestor", new Set(ALL_NAV_ITEMS.map((item) => item.href)));
    expect(hrefs(items)).not.toContain("/configuracoes");
  });

  it("respeita a visibilidade configurada para Consultor", () => {
    const items = getNavItemsForRole("Consultor", new Set(["/", "/leads"]));
    expect(hrefs(items)).toContain("/leads");
    expect(hrefs(items)).not.toContain("/contatos");
  });

  it("entrega todos os módulos ao Administrador, independente da visibilidade", () => {
    const items = getNavItemsForRole("Administrador", new Set(["/"]));
    expect(hrefs(items)).toEqual(ALL_NAV_ITEMS.map((item) => item.href));
  });
});

describe("catálogo de visibilidade", () => {
  it("representa os dez cargos oficiais", () => {
    expect([...PERFIS_VISIBILIDADE]).toEqual([
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
    ]);
  });

  it("não duplica módulos nem rotas", () => {
    const rotas = ALL_NAV_ITEMS.map((item) => item.href);
    const titulos = ALL_NAV_ITEMS.map((item) => item.title.trim());

    expect(new Set(rotas).size).toBe(rotas.length);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("aponta Clientes para a rota existente /clientes", () => {
    const clientes = ALL_NAV_ITEMS.find((item) => item.title === "Clientes");
    expect(clientes?.href).toBe("/clientes");
  });

  it("cataloga Cobranças e Comissões com permissão de visualização", () => {
    const cobrancas = ALL_NAV_ITEMS.find((item) => item.href === "/cobranca");
    const comissoes = ALL_NAV_ITEMS.find((item) => item.href === "/comissoes");

    expect(cobrancas?.requiredPermission).toBe("cobranca.ver");
    expect(comissoes?.requiredPermissions).toEqual([
      "comissoes.ver_proprias",
      "comissoes.ver_todas",
    ]);
  });

  it("não cria módulos sem página implementada", () => {
    const rotas = ALL_NAV_ITEMS.map((item) => item.href);

    expect(rotas).not.toContain("/playbooks");
    expect(rotas).not.toContain("/reunioes");
    expect(rotas).not.toContain("/simulacoes");
    expect(rotas).not.toContain("/tarefas");
  });
});