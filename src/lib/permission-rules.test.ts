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
});