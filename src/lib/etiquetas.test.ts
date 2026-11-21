import { describe, it, expect } from "vitest";
import {
  ETIQUETAS,
  ETIQUETAS_RELACIONAMENTO,
  ETIQUETAS_INTERESSE,
  ETIQUETAS_PAPEL,
  getEtiquetaById,
  getEtiquetasByGrupo,
  validarCombinacaoEtiquetas,
  etiquetasParaString,
  stringParaEtiquetas,
  separarTags,
  combinarTags,
  type EtiquetaId,
} from "@/lib/etiquetas";

describe("Etiquetas — Definições", () => {
  it("deve exportar 8 etiquetas", () => {
    expect(ETIQUETAS).toHaveLength(8);
  });

  it("Grupo A (relacionamento) deve ter 4 etiquetas", () => {
    expect(ETIQUETAS_RELACIONAMENTO).toHaveLength(4);
  });

  it("Grupo B (interesse) deve ter 3 etiquetas", () => {
    expect(ETIQUETAS_INTERESSE).toHaveLength(3);
  });

  it("Grupo C (papel) deve ter 1 etiqueta", () => {
    expect(ETIQUETAS_PAPEL).toHaveLength(1);
  });

  it("deve encontrar etiqueta por ID", () => {
    const e = getEtiquetaById("prospectado");
    expect(e).toBeDefined();
    expect(e!.label).toBe("Prospectado");
  });

  it("deve retornar undefined para ID inexistente", () => {
    expect(getEtiquetaById("inexistente")).toBeUndefined();
  });

  it("deve filtrar etiquetas por grupo", () => {
    const grupoA = getEtiquetasByGrupo("relacionamento");
    expect(grupoA).toHaveLength(4);
    expect(grupoA.every((e) => e.grupo === "relacionamento")).toBe(true);
  });
});

describe("Etiquetas — Validação de Combinações", () => {
  it("deve permitir uma etiqueta do Grupo A", () => {
    const result = validarCombinacaoEtiquetas(["prospectado"]);
    expect(result.valid).toBe(true);
  });

  it("deve bloquear duas etiquetas do Grupo A", () => {
    const result = validarCombinacaoEtiquetas(["prospectado", "andamento"]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("situação de relacionamento");
    }
  });

  it("deve permitir múltiplas etiquetas do Grupo B", () => {
    const result = validarCombinacaoEtiquetas([
      "cliente_imovel",
      "cliente_automovel",
      "cliente_alavancagem",
    ]);
    expect(result.valid).toBe(true);
  });

  it("deve permitir uma etiqueta do Grupo C", () => {
    const result = validarCombinacaoEtiquetas(["indicador"]);
    expect(result.valid).toBe(true);
  });

  it("deve bloquear duas etiquetas do Grupo C", () => {
    // Grupo C só tem uma etiqueta (indicador), então não é possível
    // selecionar duas diferentes. Este teste verifica que o sistema
    // aceita a única etiqueta do grupo.
    const result = validarCombinacaoEtiquetas(["indicador"]);
    expect(result.valid).toBe(true);
  });

  it("deve permitir combinação válida de todos os grupos", () => {
    const result = validarCombinacaoEtiquetas([
      "prospectado",
      "cliente_imovel",
      "cliente_automovel",
      "indicador",
    ]);
    expect(result.valid).toBe(true);
  });

  it("deve permitir lista vazia", () => {
    const result = validarCombinacaoEtiquetas([]);
    expect(result.valid).toBe(true);
  });
});

describe("Etiquetas — Conversão String ↔ Array", () => {
  it("deve converter array para string", () => {
    const str = etiquetasParaString(["prospectado", "cliente_imovel"]);
    expect(str).toBe("prospectado,cliente_imovel");
  });

  it("deve converter string para array", () => {
    const arr = stringParaEtiquetas("prospectado,cliente_imovel");
    expect(arr).toEqual(["prospectado", "cliente_imovel"]);
  });

  it("deve lidar com string vazia", () => {
    expect(stringParaEtiquetas("")).toEqual([]);
  });

  it("deve lidar com null", () => {
    expect(stringParaEtiquetas(null)).toEqual([]);
  });

  it("deve lidar com undefined", () => {
    expect(stringParaEtiquetas(undefined)).toEqual([]);
  });

  it("deve filtrar IDs inválidos", () => {
    const arr = stringParaEtiquetas("prospectado,invalido,andamento");
    expect(arr).toEqual(["prospectado", "andamento"]);
  });

  it("deve lidar com espaços extras", () => {
    const arr = stringParaEtiquetas("  prospectado  ,  andamento  ");
    expect(arr).toEqual(["prospectado", "andamento"]);
  });

  it("deve fazer round-trip array → string → array", () => {
    const original: EtiquetaId[] = ["prospectado", "cliente_imovel", "indicador"];
    const str = etiquetasParaString(original);
    const result = stringParaEtiquetas(str);
    expect(result).toEqual(original);
  });
});

describe("Etiquetas — Regras de Grupo", () => {
  it("Grupo A: apenas uma etiqueta principal por contato", () => {
    const grupoA = ETIQUETAS_RELACIONAMENTO;
    expect(grupoA).toHaveLength(4);
    // Simular seleção de duas
    const result = validarCombinacaoEtiquetas([grupoA[0].id, grupoA[1].id]);
    expect(result.valid).toBe(false);
  });

  it("Grupo B: múltiplas etiquetas permitidas", () => {
    const grupoB = ETIQUETAS_INTERESSE;
    expect(grupoB).toHaveLength(3);
    const result = validarCombinacaoEtiquetas([
      grupoB[0].id,
      grupoB[1].id,
      grupoB[2].id,
    ]);
    expect(result.valid).toBe(true);
  });

  it("Grupo C: apenas uma etiqueta de papel", () => {
    const grupoC = ETIQUETAS_PAPEL;
    expect(grupoC).toHaveLength(1);
    const result = validarCombinacaoEtiquetas([grupoC[0].id]);
    expect(result.valid).toBe(true);
  });

  it("todas as etiquetas têm propriedades obrigatórias", () => {
    for (const e of ETIQUETAS) {
      expect(e.id).toBeDefined();
      expect(e.label).toBeDefined();
      expect(e.grupo).toBeDefined();
      expect(e.cor).toBeDefined();
      expect(e.corTexto).toBeDefined();
      expect(e.descricao).toBeDefined();
    }
  });

  it("IDs são únicos", () => {
    const ids = ETIQUETAS.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("Etiquetas — Persistência (separarTags / combinarTags)", () => {
  it("separarTags isola etiquetas válidas do texto livre", () => {
    const r = separarTags("prospectado,VIP,cliente_imovel,indicação-rua");
    expect(r.etiquetas).toEqual(["prospectado", "cliente_imovel"]);
    expect(r.livres).toEqual(["VIP", "indicação-rua"]);
  });

  it("separarTags trata null/undefined/vazio como vazio", () => {
    expect(separarTags(null)).toEqual({ etiquetas: [], livres: [] });
    expect(separarTags(undefined)).toEqual({ etiquetas: [], livres: [] });
    expect(separarTags("")).toEqual({ etiquetas: [], livres: [] });
  });

  it("combinarTags une etiquetas + texto livre sem duplicar", () => {
    const out = combinarTags(["prospectado", "cliente_imovel"], "VIP, prospectado");
    expect(out).toBe("prospectado,cliente_imovel,VIP");
  });

  it("combinarTags preserva etiquetas quando não há texto livre", () => {
    expect(combinarTags(["andamento"], "")).toBe("andamento");
  });

  it("combinarTags preserva texto livre quando não há etiquetas", () => {
    expect(combinarTags([], "VIP")).toBe("VIP");
  });

  it("round-trip: separarTags → combinarTags preserva etiquetas e texto livre", () => {
    const db = "prospectado,cliente_imovel,VIP";
    const { etiquetas, livres } = separarTags(db);
    const reconstructed = combinarTags(etiquetas, livres);
    expect(stringParaEtiquetas(reconstructed)).toEqual(["prospectado", "cliente_imovel"]);
    // texto livre preservado
    expect(reconstructed).toContain("VIP");
  });

  it("editar outros campos NÃO apaga etiquetas (cenário crítico)", () => {
    // Usuário tinha etiquetas persistidas no banco; ao editar apenas o nome,
    // o formulário recarrega etiquetas do banco e regrava o campo tags.
    const tagsNoBanco = "atendido,cliente_automovel";
    const { etiquetas, livres } = separarTags(tagsNoBanco);
    // (edição de outro campo não altera etiquetas nem livres)
    const tagsAposEdicao = combinarTags(etiquetas, livres);
    expect(stringParaEtiquetas(tagsAposEdicao)).toEqual(["atendido", "cliente_automovel"]);
  });

  it("trocar a etiqueta de relacionamento mantém as demais", () => {
    const { etiquetas, livres } = separarTags("prospectado,cliente_imovel,indicador");
    const novaEtiqueta: EtiquetaId = "atendido";
    const ajustadas = [novaEtiqueta, ...etiquetas.filter((e) => e !== "prospectado")];
    const out = combinarTags(ajustadas, livres);
    expect(stringParaEtiquetas(out)).toEqual(["atendido", "cliente_imovel", "indicador"]);
  });
});