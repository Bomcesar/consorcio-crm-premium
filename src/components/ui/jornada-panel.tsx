"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  SkipForward,
  Square,
  Plus,
  Calendar,
  UserCheck,
  FileText,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type JornadaTipo,
  type ContatoJornadas,
  type JornadaEstado,
  type ResultadoReuniao,
  type Reuniao,
  type JornadaHistoricoEntry,
  createEmptyJornadas,
  salvarJornadasDemo,
  carregarJornadasDemo,
  getEtapasByJornada,
  getEtapaDef,
  getProximaEtapa,
  isEtapaEncerramento,
  getJornadaLabel,
  RESULTADO_REUNIAO_LABEL,
} from "@/lib/jornadas";
import { isDemoEnabled } from "@/lib/validations/auth";
import { JornadaBadge } from "./jornada-badge";
import * as jornadasRepo from "@/repositories/client/jornadas.repository";

interface JornadaPanelProps {
  contatoId: string;
  contatoTipo?: "cliente" | "lead";
  contatoNome: string;
  /** Callback quando as jornadas mudam (para atualizar UI externa) */
  onChange?: (jornadas: ContatoJornadas) => void;
}

const JORNADA_TIPO_LIST: JornadaTipo[] = ["cliente", "indicador", "recrutamento"];

/**
 * Painel de gestão das três jornadas independentes.
 *
 * Permite:
 * - Iniciar uma jornada
 * - Avançar para a próxima etapa
 * - Encerrar uma jornada (perdido, recusou, desistiu, etc.)
 * - Registrar reuniões com resultado e oportunidades
 * - Visualizar histórico unificado
 *
 * Cada jornada é independente: alterar uma não afeta as outras.
 */
export function JornadaPanel({ contatoId, contatoTipo = "cliente", contatoNome, onChange }: JornadaPanelProps) {
  const [jornadas, setJornadas] = useState<ContatoJornadas>(createEmptyJornadas());
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoadingData(true);
      try {
        if (isDemoEnabled) {
          const data = carregarJornadasDemo(contatoId, contatoTipo);
          if (!cancelled) setJornadas(data);
        } else {
          const rows = await jornadasRepo.listarJornadasPorContato(contatoId, contatoTipo);
          const base = createEmptyJornadas();
          base.contato_id = contatoId;
          base.contato_tipo = contatoTipo;
          const historicoAcc: JornadaHistoricoEntry[] = [];
          const reunioesAcc: Reuniao[] = [];
          const reunioesSeen = new Set<string>();
          for (const row of rows) {
            const tipo = row.jornada_tipo as "cliente" | "indicador" | "recrutamento";
            base.jornadas[tipo] = {
              ativa: row.ativa,
              etapa: row.etapa,
              iniciada_em: row.iniciada_em,
              encerrada_em: row.encerrada_em,
              responsavel: row.responsavel,
            };
            try {
              const hist = await jornadasRepo.listarHistoricoJornada(row.id);
              hist.forEach((h, i) => {
                historicoAcc.push({
                  id: h.id,
                  jornada_tipo: tipo,
                  etapa_anterior: i > 0 ? hist[i - 1].etapa : null,
                  etapa_nova: h.etapa,
                  observacao: h.observacao,
                  responsavel: h.responsavel,
                  data: h.data,
                });
              });
            } catch {
              /* histórico indisponível */
            }
            try {
              const reun = await jornadasRepo.listarReunioesJornada(row.id);
              for (const r of reun) {
                if (reunioesSeen.has(r.id)) continue;
                reunioesSeen.add(r.id);
                reunioesAcc.push({
                  id: r.id,
                  data: r.data,
                  resultado: r.resultado as ResultadoReuniao,
                  oportunidades: (r.oportunidades as JornadaTipo[]) ?? [],
                  observacoes: r.observacoes,
                  responsavel: r.responsavel,
                });
              }
            } catch {
              /* reuniões indisponíveis */
            }
          }
          base.historico = historicoAcc.sort((a, b) => a.data.localeCompare(b.data));
          base.reunioes = reunioesAcc.sort((a, b) => b.data.localeCompare(a.data));
          if (!cancelled) setJornadas(base);
        }
      } catch {
        // silencioso — mantém estado vazio
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [contatoId, contatoTipo]);

  const [activeTab, setActiveTab] = useState<string>("jornadas");
  const [responsavel, setResponsavel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [showEncerrar, setShowEncerrar] = useState<JornadaTipo | null>(null);
  const [encerramentoEtapa, setEncerramentoEtapa] = useState<string>("");

  // Reunião form
  const [reuniaoData, setReuniaoData] = useState("");
  const [reuniaoResultado, setReuniaoResultado] = useState<ResultadoReuniao>("interesse_credito");
  const [reuniaoOportunidades, setReuniaoOportunidades] = useState<JornadaTipo[]>([]);
  const [reuniaoObs, setReuniaoObs] = useState("");
  const [showReuniaoForm, setShowReuniaoForm] = useState(false);

  const persist = useCallback(
    async (updated: ContatoJornadas): Promise<Record<string, string>> => {
      setJornadas(updated);
      if (isDemoEnabled) {
        salvarJornadasDemo(updated);
        onChange?.(updated);
        return {};
      }
      const ids: Record<string, string> = {};
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const existing = await jornadasRepo.listarJornadasPorContato(contatoId, contatoTipo);
          for (const tipo of ["cliente", "indicador", "recrutamento"] as const) {
            const j = updated.jornadas[tipo];
            const found = existing.find((r) => r.jornada_tipo === tipo);
            if (found) {
              // Sempre atualiza (inclusive desativação/reset) para não perder estado.
              const row = await jornadasRepo.atualizarJornada(found.id, {
                ativa: j.ativa,
                etapa: j.etapa,
                iniciada_em: j.iniciada_em,
                encerrada_em: j.encerrada_em,
                responsavel: j.responsavel,
              });
              ids[tipo] = row.id;
            } else if (j.ativa) {
              const row = await jornadasRepo.criarJornada({
                contato_id: contatoId,
                contato_tipo: contatoTipo,
                jornada_tipo: tipo,
                ativa: j.ativa,
                etapa: j.etapa,
                iniciada_em: j.iniciada_em,
                encerrada_em: j.encerrada_em,
                responsavel: j.responsavel,
                observacoes: updated.observacoes ?? null,
                usuario_id: user.id,
              });
              ids[tipo] = row.id;
            }
          }
        }
      } catch {
        // silencioso — erro de persistência
      }
      onChange?.(updated);
      return ids;
    },
    [contatoId, contatoTipo, onChange],
  );

  // --- Iniciar jornada ---
  const handleIniciar = async (tipo: JornadaTipo) => {
    const etapas = getEtapasByJornada(tipo);
    const primeiraEtapa = etapas[0];
    if (!primeiraEtapa) return;

    const updated: ContatoJornadas = {
      ...jornadas,
      jornadas: {
        ...jornadas.jornadas,
        [tipo]: {
          ativa: true,
          etapa: primeiraEtapa.id,
          iniciada_em: new Date().toISOString(),
          encerrada_em: null,
          responsavel: responsavel.trim() || null,
        },
      },
      historico: [
        ...jornadas.historico,
        {
          id: crypto.randomUUID(),
          jornada_tipo: tipo,
          etapa_anterior: null,
          etapa_nova: primeiraEtapa.id,
          observacao: observacao.trim() || null,
          responsavel: responsavel.trim() || null,
          data: new Date().toISOString(),
        },
      ],
    };
    const ids = await persist(updated);
    if (!isDemoEnabled && ids[tipo]) {
      await jornadasRepo
        .registrarHistoricoJornada(ids[tipo], primeiraEtapa.id, responsavel.trim() || null, observacao.trim() || null)
        .catch(() => {});
    }
    setObservacao("");
  };

  // --- Avançar etapa ---
  const handleAvancar = async (tipo: JornadaTipo) => {
    const estado = jornadas.jornadas[tipo];
    if (!estado.ativa || !estado.etapa) return;

    const proxima = getProximaEtapa(tipo, estado.etapa);
    if (!proxima) return;

    const updated: ContatoJornadas = {
      ...jornadas,
      jornadas: {
        ...jornadas.jornadas,
        [tipo]: {
          ...estado,
          etapa: proxima.id,
        },
      },
      historico: [
        ...jornadas.historico,
        {
          id: crypto.randomUUID(),
          jornada_tipo: tipo,
          etapa_anterior: estado.etapa,
          etapa_nova: proxima.id,
          observacao: observacao.trim() || null,
          responsavel: responsavel.trim() || null,
          data: new Date().toISOString(),
        },
      ],
    };
    const ids = await persist(updated);
    if (!isDemoEnabled && ids[tipo]) {
      await jornadasRepo
        .registrarHistoricoJornada(ids[tipo], proxima.id, responsavel.trim() || null, observacao.trim() || null)
        .catch(() => {});
    }
    setObservacao("");
  };

  // --- Encerrar jornada ---
  const handleEncerrar = async (tipo: JornadaTipo, etapaId: string) => {
    const estado = jornadas.jornadas[tipo];
    if (!estado.ativa || !estado.etapa) return;

    const updated: ContatoJornadas = {
      ...jornadas,
      jornadas: {
        ...jornadas.jornadas,
        [tipo]: {
          ...estado,
          etapa: etapaId,
          encerrada_em: new Date().toISOString(),
        },
      },
      historico: [
        ...jornadas.historico,
        {
          id: crypto.randomUUID(),
          jornada_tipo: tipo,
          etapa_anterior: estado.etapa,
          etapa_nova: etapaId,
          observacao: observacao.trim() || null,
          responsavel: responsavel.trim() || null,
          data: new Date().toISOString(),
        },
      ],
    };
    const ids = await persist(updated);
    if (!isDemoEnabled && ids[tipo]) {
      await jornadasRepo
        .registrarHistoricoJornada(ids[tipo], etapaId, responsavel.trim() || null, observacao.trim() || null)
        .catch(() => {});
    }
    setShowEncerrar(null);
    setEncerramentoEtapa("");
    setObservacao("");
  };

  // --- Registrar reunião ---
  const handleRegistrarReuniao = async () => {
    if (!reuniaoData) return;
    const reuniao: Reuniao = {
      id: crypto.randomUUID(),
      data: reuniaoData,
      resultado: reuniaoResultado,
      oportunidades: reuniaoOportunidades,
      observacoes: reuniaoObs.trim() || null,
      responsavel: responsavel.trim() || null,
    };
    const updated: ContatoJornadas = {
      ...jornadas,
      reunioes: [reuniao, ...jornadas.reunioes],
    };
    const ids = await persist(updated);
    if (!isDemoEnabled) {
      // Vincular a reunião a uma jornada hospedeira (primeira oportunidade ou 'cliente').
      const targetTipo: JornadaTipo = reuniaoOportunidades[0] ?? "cliente";
      let jornadaId = ids[targetTipo];
      if (!jornadaId) {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const row = await jornadasRepo.criarJornada({
              contato_id: contatoId,
              contato_tipo: contatoTipo,
              jornada_tipo: targetTipo,
              ativa: false,
              etapa: null,
              iniciada_em: null,
              encerrada_em: null,
              responsavel: null,
              observacoes: null,
              usuario_id: user.id,
            });
            jornadaId = row.id;
          }
        } catch {
          /* falha ao criar jornada hospedeira */
        }
      }
      if (jornadaId) {
        await jornadasRepo
          .criarReuniaoJornada(
            jornadaId,
            reuniaoData,
            reuniaoResultado,
            reuniaoOportunidades.length ? reuniaoOportunidades : null,
            reuniaoObs.trim() || null,
            responsavel.trim() || null,
          )
          .catch(() => {});
      }
    }
    setShowReuniaoForm(false);
    setReuniaoData("");
    setReuniaoResultado("interesse_credito");
    setReuniaoOportunidades([]);
    setReuniaoObs("");
  };

  const toggleOportunidade = (tipo: JornadaTipo) => {
    setReuniaoOportunidades((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  // --- Histórico filtrado por jornada ---
  const historicoPorJornada = useMemo(() => {
    const result: Record<string, typeof jornadas.historico> = {
      all: jornadas.historico,
      cliente: jornadas.historico.filter((h) => h.jornada_tipo === "cliente"),
      indicador: jornadas.historico.filter((h) => h.jornada_tipo === "indicador"),
      recrutamento: jornadas.historico.filter((h) => h.jornada_tipo === "recrutamento"),
    };
    return result;
  }, [jornadas.historico]);

  // --- Etapas de encerramento disponíveis ---
  const etapasEncerramento = useMemo(() => {
    const result: Record<JornadaTipo, string[]> = {
      cliente: [],
      indicador: [],
      recrutamento: [],
    };
    for (const tipo of JORNADA_TIPO_LIST) {
      result[tipo] = getEtapasByJornada(tipo)
        .filter((e) => e.encerramento)
        .map((e) => e.id);
    }
    return result;
  }, []);

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-sm text-muted-foreground">Carregando jornadas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campos de responsável e observação */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Responsável</Label>
          <Input
            placeholder="Nome do responsável"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Observação (opcional)</Label>
          <Input
            placeholder="Nota para o histórico"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Abas: Jornadas | Reuniões | Histórico */}
      <Tabs defaultValue="jornadas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jornadas">Jornadas</TabsTrigger>
          <TabsTrigger value="reunioes">Reuniões ({jornadas.reunioes.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({jornadas.historico.length})</TabsTrigger>
        </TabsList>

        {/* --- Aba Jornadas --- */}
        <TabsContent value="jornadas" className="space-y-3">
          {JORNADA_TIPO_LIST.map((tipo) => {
            const estado = jornadas.jornadas[tipo];
            const etapas = getEtapasByJornada(tipo);
            const etapaAtual = estado.etapa ? getEtapaDef(tipo, estado.etapa) : null;
            const proxima = estado.ativa && estado.etapa ? getProximaEtapa(tipo, estado.etapa) : null;
            const encerrada = estado.encerrada_em !== null;

            return (
              <Card key={tipo} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {getJornadaLabel(tipo)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {estado.ativa && !encerrada && (
                        <Badge variant="outline" className="text-[10px]">
                          Ativa
                        </Badge>
                      )}
                      {encerrada && (
                        <Badge variant="secondary" className="text-[10px]">
                          Encerrada
                        </Badge>
                      )}
                      {!estado.ativa && !encerrada && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Não iniciada
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Etapa atual */}
                  {estado.etapa && (
                    <div className="flex items-center gap-2">
                      <JornadaBadge jornadaTipo={tipo} etapaId={estado.etapa} />
                      {estado.iniciada_em && (
                        <span className="text-[10px] text-muted-foreground">
                          Iniciada em {new Date(estado.iniciada_em).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Barra de progresso */}
                  {estado.ativa && !encerrada && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Progresso</span>
                        <span>
                          {etapas.findIndex((e) => e.id === estado.etapa) + 1} / {etapas.length}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary transition-all"
                          style={{
                            width: `${((etapas.findIndex((e) => e.id === estado.etapa) + 1) / etapas.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    {!estado.ativa && !encerrada && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => handleIniciar(tipo)}
                      >
                        <Play className="h-3 w-3" />
                        Iniciar jornada
                      </Button>
                    )}

                    {estado.ativa && !encerrada && proxima && (
                      <Button
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleAvancar(tipo)}
                      >
                        <SkipForward className="h-3 w-3" />
                        Avançar para: {proxima.label}
                      </Button>
                    )}

                    {estado.ativa && !encerrada && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => {
                          setShowEncerrar(showEncerrar === tipo ? null : tipo);
                          setEncerramentoEtapa("");
                        }}
                      >
                        <Square className="h-3 w-3" />
                        Encerrar
                      </Button>
                    )}

                    {encerrada && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => {
                          const updated: ContatoJornadas = {
                            ...jornadas,
                            jornadas: {
                              ...jornadas.jornadas,
                              [tipo]: {
                                ativa: false,
                                etapa: null,
                                iniciada_em: null,
                                encerrada_em: null,
                                responsavel: null,
                              },
                            },
                          };
                          persist(updated);
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reiniciar
                      </Button>
                    )}
                  </div>

                  {/* Seletor de encerramento */}
                  {showEncerrar === tipo && (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <Label className="text-xs">Motivo de encerramento</Label>
                      <select
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={encerramentoEtapa}
                        onChange={(e) => setEncerramentoEtapa(e.target.value)}
                      >
                        <option value="">Selecione o motivo</option>
                        {etapasEncerramento[tipo].map((id) => {
                          const def = getEtapaDef(tipo, id);
                          return (
                            <option key={id} value={id}>
                              {def?.label ?? id}
                            </option>
                          );
                        })}
                      </select>
                      {encerramentoEtapa && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1 text-xs"
                          onClick={() => handleEncerrar(tipo, encerramentoEtapa)}
                        >
                          <Square className="h-3 w-3" />
                          Confirmar encerramento
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Info de encerramento */}
                  {encerrada && etapaAtual?.encerramento && (
                    <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                      Encerrada em {new Date(estado.encerrada_em!).toLocaleDateString("pt-BR")}
                      {estado.responsavel && ` por ${estado.responsavel}`}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* --- Aba Reuniões --- */}
        <TabsContent value="reunioes" className="space-y-3">
          {!showReuniaoForm ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setShowReuniaoForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar reunião
            </Button>
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Nova reunião</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data da reunião</Label>
                    <Input
                      type="date"
                      value={reuniaoData}
                      onChange={(e) => setReuniaoData(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Resultado</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={reuniaoResultado}
                      onChange={(e) => setReuniaoResultado(e.target.value as ResultadoReuniao)}
                    >
                      {Object.entries(RESULTADO_REUNIAO_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Oportunidades identificadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {JORNADA_TIPO_LIST.map((tipo) => (
                      <Button
                        key={tipo}
                        type="button"
                        size="sm"
                        variant={reuniaoOportunidades.includes(tipo) ? "default" : "outline"}
                        className="gap-1 text-xs"
                        onClick={() => toggleOportunidade(tipo)}
                      >
                        {reuniaoOportunidades.includes(tipo) && (
                          <UserCheck className="h-3 w-3" />
                        )}
                        {getJornadaLabel(tipo)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Múltiplas oportunidades podem ser selecionadas.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    placeholder="Anotações da reunião"
                    value={reuniaoObs}
                    onChange={(e) => setReuniaoObs(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRegistrarReuniao} disabled={!reuniaoData}>
                    <Calendar className="mr-1 h-3 w-3" />
                    Salvar reunião
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReuniaoForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {jornadas.reunioes.map((reuniao) => (
            <Card key={reuniao.id} className="border-border/50">
              <CardContent className="pt-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(reuniao.data).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {RESULTADO_REUNIAO_LABEL[reuniao.resultado]}
                    </p>
                    {reuniao.oportunidades.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {reuniao.oportunidades.map((tipo) => (
                          <Badge key={tipo} variant="outline" className="text-[10px]">
                            {getJornadaLabel(tipo)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {reuniao.observacoes && (
                      <p className="pt-1 text-xs text-muted-foreground">
                        {reuniao.observacoes}
                      </p>
                    )}
                    {reuniao.responsavel && (
                      <p className="text-[10px] text-muted-foreground">
                        Responsável: {reuniao.responsavel}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {jornadas.reunioes.length === 0 && !showReuniaoForm && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhuma reunião registrada.
            </p>
          )}
        </TabsContent>

        {/* --- Aba Histórico --- */}
        <TabsContent value="historico" className="space-y-2">
          {jornadas.historico.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhuma alteração registrada.
            </p>
          ) : (
            <div className="space-y-1">
              {[...jornadas.historico].reverse().map((entry) => {
                const etapaAnterior = entry.etapa_anterior
                  ? getEtapaDef(entry.jornada_tipo, entry.etapa_anterior)
                  : null;
                const etapaNova = getEtapaDef(entry.jornada_tipo, entry.etapa_nova);

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 rounded-md border border-border/30 bg-muted/20 px-2 py-1.5"
                  >
                    <FileText className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="font-medium">
                          {getJornadaLabel(entry.jornada_tipo)}
                        </span>
                        {etapaAnterior && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-muted-foreground">{etapaAnterior.label}</span>
                          </>
                        )}
                        {!etapaAnterior && (
                          <>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <span className="font-medium">{etapaNova?.label ?? entry.etapa_nova}</span>
                      </div>
                      {entry.observacao && (
                        <p className="text-[10px] text-muted-foreground">
                          {entry.observacao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{new Date(entry.data).toLocaleString("pt-BR")}</span>
                        {entry.responsavel && <span>· {entry.responsavel}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}