import { describe, expect, it } from "vitest";
import { hasPermissionForPerfil } from "./permission-rules";

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