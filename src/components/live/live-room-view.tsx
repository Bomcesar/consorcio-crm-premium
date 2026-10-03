"use client";

import * as React from "react";
import {
  Play,
  Square,
  Mic,
  MicOff,
  MonitorUp,
  ArrowLeft,
  Hand,
  X,
  Gift,
  Loader2,
  Radio,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveToast } from "./use-live-toast";
import { SalaMidia } from "./live-room";
import { LiveMediaBridge } from "./live-media-bridge";
import { LiveSeatStage } from "./live-seat-stage";
import { LiveChat } from "./live-chat";
import { LiveGiftPanel } from "./live-gift-panel";
import { LiveInvitePanel } from "./live-invite-panel";
import { LivePresentation } from "./live-presentation";
import { LiveConnectionState } from "./live-connection-state";
import { useLiveRoom } from "@/hooks/live/use-live-room";
import { useLiveChat } from "@/hooks/live/use-live-chat";
import { useLivePresentes } from "@/hooks/live/use-live-presentes";
import { useLiveApresentacao } from "@/hooks/live/use-live-presentation";
import {
  useLiveCredencial,
  useLivePublicacao,
  type ConexaoMedia,
} from "@/hooks/live/use-live-media";
import {
  atualizarLive,
  atualizarMeuEstado,
  entrarComoOuvinte,
  encerrarLive,
  iniciarLive,
  registrarAnfitriao,
} from "@/repositories/client/live/live.repository";
import { getCatalogoPresentes } from "@/repositories/client/live/live-presentes.repository";
import {
  aceitarSolicitacao,
  acaoSobreParticipante,
  cancelarSolicitacao,
  getMinhaSolicitacao,
  pedirParaFalar,
  sairDaCadeira,
} from "@/repositories/client/live/live-participants.repository";
import {
  LIVE_STATUS_LABEL,
  type LiveParticipante,
  type LivePresente,
} from "@/lib/live/types";
import { descreverErroLive } from "@/lib/live/erros";
import { rotuloEstado, statusParaModo } from "@/lib/live/live-state";
import { formatCreditoBRL, tempoRelativo } from "@/lib/live/format";
import { getAuthenticatedUser } from "@/lib/auth-user";

type Props = {
  liveId: string;
  isHost: boolean;
};

export function LiveRoomView({ liveId, isHost }: Props) {
  const toast = useLiveToast();
  const [meuUsuarioId, setMeuUsuarioId] = React.useState<string | null>(null);

  React.useEffect(() => {
    getAuthenticatedUser()
      .then((u) => setMeuUsuarioId(u.id))
      .catch(() => setMeuUsuarioId(null));
  }, []);

  const sala = useLiveRoom({ liveId, souAnfitriao: isHost, meuUsuarioId });

  const chat = useLiveChat({ liveId, modo: "interno" });
  const presentes = useLivePresentes({ liveId });
  const apresentacao = useLiveApresentacao({ liveId, souAnfitriao: isHost });

  const [catalogo, setCatalogo] = React.useState<
    { categoria: { id: string; nome: string; emoji: string }; presentes: LivePresente[] }[]
  >([]);

  React.useEffect(() => {
    getCatalogoPresentes()
      .then(setCatalogo)
      .catch(() => setCatalogo([]));
  }, []);

  const [destinatarioPresente, setDestinatarioPresente] = React.useState<LiveParticipante | null>(
    null,
  );
  const [giftAberto, setGiftAberto] = React.useState(false);
  const [minhaSolicitacao, setMinhaSolicitacao] = React.useState<"pendente" | null>(null);
  const [confirmarEncerramento, setConfirmarEncerramento] = React.useState(false);
  const [encerrando, setEncerrando] = React.useState(false);

  const modo = (sala.sala?.modo ?? "audio") as "audio" | "apresentacao";
  const status = (sala.sala?.status ?? "aguardando") as
    | "aguardando"
    | "ao_vivo"
    | "apresentacao"
    | "encerrada";
  const emCadeira = sala.emCadeira;

  const credencial = useLiveCredencial(liveId);
  const publicacao = useLivePublicacao({ podePublicar: emCadeira });

  const [conexao, setConexao] = React.useState<ConexaoMedia>("desconectado");

  // O fluxo real do microfone vem do track publicado pelo LiveKit:
  // o indicador de fala mede o áudio que está de fato indo para a sala.
  // O hook que depende do RoomContext roda em `LiveSeatStage`, dentro
  // de `SalaMidia` — ver o comentário do componente.
  const fluxoLocal = publicacao.fluxoLocal;

  const erro = publicacao.falha ?? credencial.falha;
  const descricaoErro = erro ? descreverErroLive(erro.codigo, erro.mensagem) : null;

  // Entrada: o ouvinte registra presença; o anfitrião registra o palco.
  React.useEffect(() => {
    if (!sala.sala) return;
    const entrar = async () => {
        try {
          if (isHost) {
            await registrarAnfitriao(sala.sala!);
          } else {
            await entrarComoOuvinte(liveId);
          }
        } catch (e) {
          const codigo = e instanceof Error ? e.message : "";
          // Duplicidade e sala encerrada são estados esperados, não falhas:
          // a presença já consta no banco ou a live simplesmente acabou.
          if (codigo !== "ja_participa") {
            console.error("[LiveRoomView] entrada:", codigo);
            if (codigo === "live_encerrada") {
              toast({
                title: "Live encerrada",
                description: "Esta Live não recebe mais novos participantes.",
              });
            }
          }
        }
      };
    void entrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sala.sala?.id]);

  React.useEffect(() => {
    getMinhaSolicitacao(liveId)
      .then((s) => setMinhaSolicitacao(s?.status === "pendente" ? "pendente" : null))
      .catch(() => {});
  }, [liveId, sala.meu]);

  // Solicitações pendentes (anfitrião)
  const pedirFala = async () => {
    try {
      await pedirParaFalar(liveId);
      setMinhaSolicitacao("pendente");
      toast({ title: "Solicitação enviada", description: "Aguarde o anfitrião." });
    } catch (e) {
      const codigo = e instanceof Error ? e.message : "";
      if (codigo === "solicitacao_duplicada") {
        setMinhaSolicitacao("pendente");
      } else {
        toast({ title: "Não foi possível solicitar", variant: "destructive" });
      }
    }
  };

  const aceitar = async (solicitacaoId: string, participanteId: string) => {
    try {
      await aceitarSolicitacao({
        solicitacaoId,
        participanteId,
        liveId,
        maxCadeiras: sala.sala?.max_cadeiras ?? 8,
        participantes: sala.participantes,
      });
      toast({ title: "Participante autorizado" });
    } catch (e) {
      const codigo = e instanceof Error ? e.message : "";
      const d = descreverErroLive(codigo);
      toast({ title: d.titulo, description: d.mensagem, variant: "destructive" });
    }
  };

  const acao = async (participante: LiveParticipante, tipo: "silenciar" | "remover" | "bloquear") => {
    try {
      await acaoSobreParticipante(participante.id, tipo);
      toast({ title: "Ação aplicada" });
    } catch {
      toast({ title: "Não foi possível aplicar a ação", variant: "destructive" });
    }
  };

  const alternarModo = async () => {
    const novoModo = modo === "apresentacao" ? "audio" : "apresentacao";
    try {
      await atualizarLive(liveId, {
        modo: novoModo,
        status: statusParaModo(status, novoModo),
      });
      if (novoModo === "audio") {
        await apresentacao.encerrar();
        publicacao.pararCompartilhamento();
        publicacao.desligarCamera();
      }
    } catch {
      toast({ title: "Não foi possível alterar o modo", variant: "destructive" });
    }
  };

  const alternarMicrofone = async () => {
    if (publicacao.microfoneAtivo) {
      publicacao.desligarMicrofone();
      if (sala.meuId) {
        await atualizarMeuEstado(sala.meuId, { microfone_ativo: false }).catch(() => {});
      }
    } else {
      const track = await publicacao.ligarMicrofone();
      if (track && sala.meuId) {
        await atualizarMeuEstado(sala.meuId, { microfone_ativo: true }).catch(() => {});
      }
    }
  };

  const enviarPresente = async (presente: LivePresente) => {
    if (!destinatarioPresente) return;
    const ok = await presentes.enviar(destinatarioPresente, presente);
    if (ok) {
      toast({
        title: `🎁 ${presente.nome} para ${destinatarioPresente.nome_exibicao}`,
        description: `${formatCreditoBRL(presente.valor_credito)} em crédito representado.`,
      });
    } else {
      const d = descreverErroLive(presentes.erro);
      toast({ title: d.titulo, description: d.mensagem, variant: "destructive" });
    }
  };

  const sairDaCadeiraAcionar = async () => {
    if (!sala.meuId) return;
    try {
      await sairDaCadeira(sala.meuId);
      publicacao.desligarMicrofone();
    } catch {
      toast({ title: "Não foi possível sair da cadeira", variant: "destructive" });
    }
  };

  // Status da sala: o resultado persistido é aplicado no estado local
  // para que a tela responda na hora, sem depender do Realtime.
  const iniciar = async () => {
    try {
      sala.setSala(await iniciarLive(liveId));
      toast({ title: "Live iniciada", description: "A sala já está transmitindo ao vivo." });
    } catch {
      toast({
        title: "Não foi possível iniciar a Live",
        variant: "destructive",
      });
    }
  };

  const encerrar = async () => {
    setEncerrando(true);
    try {
      sala.setSala(await encerrarLive(liveId));
      setConfirmarEncerramento(false);
      publicacao.desligarMicrofone();
      publicacao.desligarCamera();
      publicacao.pararCompartilhamento();
      toast({
        title: "Live encerrada",
        description: "O histórico permanece disponível e não pode ser reaberto.",
      });
    } catch {
      toast({
        title: "Não foi possível encerrar a Live",
        variant: "destructive",
      });
    } finally {
      setEncerrando(false);
    }
  };

  if (!sala.sala) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando a sala...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-xl font-bold">
            <Radio className="h-5 w-5 text-primary" /> {sala.sala.titulo}
          </h1>
          <p className="text-xs text-muted-foreground">
            {rotuloEstado(status, modo)} · {sala.participantes.length} participante(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "encerrada" ? "secondary" : "default"}>
            {LIVE_STATUS_LABEL[status]}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/live-voz";
            }}
          >
            Sair
          </Button>
        </div>
      </div>

      <LiveConnectionState
        conexao={conexao}
        falha={erro}
        aoFecharFalha={() => {
          publicacao.setFalha(null);
          credencial.setFalha(null);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Palco */}
        <div className="space-y-4">
          {credencial.credencial ? (
            <SalaMidia
              token={credencial.credencial.token}
              serverUrl={credencial.credencial.url}
              onConnected={() => setConexao("conectado")}
              onDisconnected={() => setConexao("reconectando")}
              onError={(c) => {
                setConexao("erro");
                publicacao.setFalha({ codigo: c });
              }}
            >
              <LiveMediaBridge
                mic={publicacao.mic}
                cam={publicacao.cam}
                tela={publicacao.tela}
              />
              <div className="space-y-4">
                {modo === "apresentacao" && (
                  <LivePresentation
                    apresentacao={apresentacao.apresentacao}
                    url={apresentacao.url}
                    souAnfitriao={isHost}
                    modo={modo}
                    onMudarPagina={(p) => void apresentacao.irParaPagina(p)}
                    onRegistrarTotal={(t) => void apresentacao.definirTotalPaginas(t)}
                    onSincronizarVideo={(r, t) => void apresentacao.sincronizarReproducao(r, t)}
                    onEncerrar={() => void alternarModo()}
                    onSelecionarArquivo={
                      isHost
                        ? async (f) => {
                            await apresentacao.abrirArquivo(f);
                          }
                        : undefined
                    }
                    onIniciarTela={
                      isHost
                        ? () => {
                            void publicacao.iniciarCompartilhamento();
                            void apresentacao.iniciarTela();
                          }
                        : undefined
                    }
                    erro={apresentacao.erro}
                  />
                )}

                <LiveSeatStage
                  participantes={sala.participantes}
                  maxCadeiras={sala.sala.max_cadeiras}
                  meuUsuarioId={meuUsuarioId}
                  presentesPorParticipante={presentes.porParticipante}
                  totalPorParticipante={presentes.totalDe}
                  podeEnviarPresente={emCadeira || isHost}
                  aoEnviarPresente={(p) => {
                    setDestinatarioPresente(p);
                    setGiftAberto(true);
                  }}
                  acoesAnfitriao={
                    isHost
                      ? (p) => ({
                          silenciar: () => void acao(p, "silenciar"),
                          remover: () => void acao(p, "remover"),
                          bloquear: () => void acao(p, "bloquear"),
                        })
                      : undefined
                  }
                  podePublicar={emCadeira}
                  microfoneAtivo={publicacao.microfoneAtivo}
                  fluxoLocal={fluxoLocal}
                />
              </div>
            </SalaMidia>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-xl border">
              <Button onClick={() => void credencial.conectar()} disabled={credencial.carregando}>
                {credencial.carregando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                Entrar na sala de áudio
              </Button>
            </div>
          )}

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
            {isHost ? (
              <>
                {status === "aguardando" && (
                  <Button size="sm" onClick={() => void iniciar()}>
                    <Play className="mr-2 h-4 w-4" /> Iniciar Live
                  </Button>
                )}
                {status !== "encerrada" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void alternarModo()}>
                      {modo === "apresentacao" ? (
                        <ArrowLeft className="mr-2 h-4 w-4" />
                      ) : (
                        <MonitorUp className="mr-2 h-4 w-4" />
                      )}
                      {modo === "apresentacao" ? "Voltar para áudio" : "Iniciar apresentação"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publicacao.iniciarCompartilhamento()}
                    >
                      <MonitorUp className="mr-2 h-4 w-4" /> Compartilhar tela
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmarEncerramento(true)}
                      disabled={encerrando}
                    >
                      <Square className="mr-2 h-4 w-4" /> Encerrar Live
                    </Button>
                  </>
                )}
                {status === "encerrada" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/live-voz";
                    }}
                  >
                    Voltar para as Lives
                  </Button>
                )}
              </>
            ) : (
              <>
                {emCadeira ? (
                  <>
                    <Button
                      size="sm"
                      variant={publicacao.microfoneAtivo ? "default" : "outline"}
                      onClick={() => void alternarMicrofone()}
                    >
                      {publicacao.microfoneAtivo ? (
                        <Mic className="mr-2 h-4 w-4" />
                      ) : (
                        <MicOff className="mr-2 h-4 w-4" />
                      )}
                      {publicacao.microfoneAtivo ? "Desligar microfone" : "Ligar microfone"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void sairDaCadeiraAcionar()}>
                      <X className="mr-2 h-4 w-4" /> Sair da cadeira
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant={minhaSolicitacao === "pendente" ? "outline" : "default"}
                    onClick={() => void pedirFala()}
                    disabled={minhaSolicitacao === "pendente"}
                  >
                    <Hand className="mr-2 h-4 w-4" />
                    {minhaSolicitacao === "pendente" ? "Solicitação enviada" : "Pedir para falar"}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Solicitações do anfitrião */}
          {isHost && sala.solicitacoes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📋 Solicitações para falar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sala.solicitacoes.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {(s.nome_exibicao ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{s.nome_exibicao}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.perfil ?? "—"} · {tempoRelativo(s.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          const p = sala.participantes.find((x) => x.usuario_id === s.usuario_id);
                          if (p) void aceitar(s.id, p.id);
                        }}
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await cancelarSolicitacao(s.id);
                          void sala.recarregarSolicitacoes();
                        }}
                      >
                        Recusar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isHost && <LiveInvitePanel liveId={liveId} />}
        </div>

        {/* Chat */}
        <div className="space-y-4">
          <LiveChat mensagens={chat.mensagens} aoEnviar={chat.enviar} alturaMaxima="h-[28rem]" />

          {presentes.celebracao && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center">
              <p className="text-sm">
                🎁 <strong>{presentes.celebracao.presente.nome}</strong> para{" "}
                <strong>{presentes.celebracao.destinatario.nome_exibicao}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCreditoBRL(presentes.celebracao.presente.valor_credito)} em crédito
                representado
              </p>
            </div>
          )}

          {descricaoErro && (
            <p className="flex items-start gap-1 text-xs text-destructive">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {descricaoErro.mensagem}
            </p>
          )}
        </div>
      </div>

      <LiveGiftPanel
        aberto={giftAberto}
        aoFechar={() => setGiftAberto(false)}
        catalogo={catalogo}
        destinatario={destinatarioPresente}
        aoConfirmar={enviarPresente}
        enviando={presentes.enviando}
      />

      <Dialog open={confirmarEncerramento} onOpenChange={setConfirmarEncerramento}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar a Live?</DialogTitle>
            <DialogDescription>
              Todos os participantes serão desconectados e o encerramento é definitivo: uma live
              encerrada não pode ser reaberta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmarEncerramento(false)}
              disabled={encerrando}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void encerrar()} disabled={encerrando}>
              {encerrando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Encerrar Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isHost && (
        <p className="text-center text-xs text-muted-foreground">
          <Gift className="mr-1 inline h-3.5 w-3.5" />
          Presentes representam crédito dentro da Live. Não são pagamentos.
        </p>
      )}
    </div>
  );
}

export default LiveRoomView;
