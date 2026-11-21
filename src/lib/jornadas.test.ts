import { describe, it, expect, beforeEach } from "vitest";
import {
  createEmptyJornadas,
  carregarJornadasDemo,
  salvarJornadasDemo,
} from "@/lib/jornadas";

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
// Mock window for SSR guards
Object.defineProperty(globalThis, "window", { value: {} });

describe("isolamento cliente/lead jornadas", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("cliente e lead com mesmo ID possuem jornadas independentes", () => {
    const cliente = carregarJornadasDemo("123", "cliente");
    const lead = carregarJornadasDemo("123", "lead");

    expect(cliente.contato_tipo).toBe("cliente");
    expect(lead.contato_tipo).toBe("lead");
    expect(cliente.contato_id).toBe("123");
    expect(lead.contato_id).toBe("123");
  });

  it("alterar jornada do cliente não altera a do lead", () => {
    const cliente = carregarJornadasDemo("123", "cliente");
    const updated = { ...cliente, jornadas: { ...cliente.jornadas, cliente: { ativa: true, etapa: "contato", iniciada_em: "2026-01-01", encerrada_em: null, responsavel: null } } };
    salvarJornadasDemo(updated);

    const lead = carregarJornadasDemo("123", "lead");
    expect(lead.jornadas.cliente.ativa).toBe(false);
  });

  it("alterar jornada do lead não altera a do cliente", () => {
    const lead = carregarJornadasDemo("123", "lead");
    const updated = { ...lead, jornadas: { ...lead.jornadas, indicador: { ativa: true, etapa: "convite", iniciada_em: "2026-01-01", encerrada_em: null, responsavel: null } } };
    salvarJornadasDemo(updated);

    const cliente = carregarJornadasDemo("123", "cliente");
    expect(cliente.jornadas.indicador.ativa).toBe(false);
  });

  it("persistência após recarregar", () => {
    const cliente = carregarJornadasDemo("456", "cliente");
    const updated = { ...cliente, jornadas: { ...cliente.jornadas, cliente: { ativa: true, etapa: "contato", iniciada_em: "2026-01-01", encerrada_em: null, responsavel: null } } };
    salvarJornadasDemo(updated);

    const recarregado = carregarJornadasDemo("456", "cliente");
    expect(recarregado.jornadas.cliente.ativa).toBe(true);
  });

  it("compatibilidade com registros antigos sem contato_tipo", () => {
    const oldRecord = {
      contato_id: "789",
      jornadas: {
        cliente: { ativa: true, etapa: "contato", iniciada_em: "2026-01-01", encerrada_em: null, responsavel: null },
        indicador: { ativa: false, etapa: null, iniciada_em: null, encerrada_em: null, responsavel: null },
        recrutamento: { ativa: false, etapa: null, iniciada_em: null, encerrada_em: null, responsavel: null },
      },
      reunioes: [],
      historico: [],
    };
    localStorageMock.setItem("crm-demo-jornadas", JSON.stringify([oldRecord]));

    const loaded = carregarJornadasDemo("789", "cliente");
    expect(loaded.jornadas.cliente.ativa).toBe(true);
  });
});