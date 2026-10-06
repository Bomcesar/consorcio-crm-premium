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
  Volume2,
  VolumeX,
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
import {
  LiveAudioControlePonte,
} from "./live-audio-controle";
import type { ControleAudioSala } from "@/hooks/live/use-live-audio-sala";
import { usePermissions } from "@/hooks/use-permissions";
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
  const [entrando, setEntrando] = React.useState(false);

  const modo = (sala.sala?.modo ?? "audio") as "audio" | "apresentacao";
  const status = (sala.sala?.status ?? "aguardando") as
    | "aguardando"
    | "ao_vivo"
    | "apresentacao"
    | "encerrada";
  // O anfitrião ocupa a cadeira 0 por construção (`registrarAnfitriao`
  // insere `cadeira: 0`), então `isHost` já garante o assento. Somar
  // `sala.emCadeira` cobre a janela em que a lista ainda não refletiu
  // o registro — sem isso, em rede móvel instável o botão de microfone
  // simplesmente não aparecia.
  const emCadeira = sala.emCadeira || isHost;
  const silenciadoPeloAnfitriao = sala.meu?.silenciado_pelo_anfitriao === true;

  const credencial = useLiveCredencial(liveId);
  const publicacao = useLivePublicacao({ podePublicar: emCadeira });

  const [conexao, setConexao] = React.useState<ConexaoMedia>("desconectado");

  // Requisito 4: quem controla o áudio precisa ser o anfitrião da sala
  // ou o Administrador. A permissão `live.audio.controlar` existe no
  // catálogo e no banco para auditoria e para o RLS, mas NÃO é
  // consultada aqui: `usePermissions` lê `user_permissoes` do
  // localStorage, que o login grava sempre vazio — usá-la como porte
  // trancaria fora anfitriões de perfis como Consultor, que são
  // perfeitamente legítimos como donos da própria sala.
  const permissoes = usePermissions();
  const podeControlarAudio = isHost || permissoes.isAdmin;

  // Requisito 2: o hook de mute precisa do RoomContext, então ele
  // vive dentro de `SalaMidia`. A barra fica fora; a ponte entrega o
  // controle por `reportar` e o valor fica num ref.
  const controleAudio = React.useRef<ControleAudioSala | null>(null);
  const [, forcarRender] = React.useReducer((n: number) => n + 1, 0);
  const reportarControleAudio = React.useCallback((c: ControleAudioSala) => {
    controleAudio.current = c;
    forcarRender();
  }, []);

  // Requisito 1 (o outro lado): o mute do anfitrião só é honesto se o
  // participante realmente parar de publicar. A linha chega por
  // `postgres_changes`, então a reação é automática.
  React.useEffect(() => {
    if (!silenciadoPeloAnfitriao) return;
    if (!publicacao.microfoneAtivo) return;
    publicacao.desligarMicrofone();
    if (sala.meuId) {
      void atualizarMeuEstado(sala.meuId, { microfone_ativo: false }).catch(() => {});
    }
    toast({
      title: "Micrófone silenciado pelo anfitrião",
      description: "Você está na cadeira, mas foi silenciado. Peça ao anfitrião para liberar.",
    });
  }, [silenciadoPeloAnfitriao, publicacao, sala.meuId, toast]);

  // O fluxo real do microfone vem do track publicado pelo LiveKit:
  // o indicador de fala mede o áudio que está de fato indo para a sala.
  // O hook que depende do RoomContext roda em `LiveSeatStage`, dentro
  // de `SalaMidia` — ver o comentário do componente.
  const fluxoLocal = publicacao.fluxoLocal;

  const erro = publicacao.falha ?? credencial.falha;
  const descricaoErro = erro ? descreverErroLive(erro.codigo, erro.mensagem) : null;

  const audioConectados = controleAudio.current?.conectados ?? 0;
  const audioTodosSilenciados = controleAudio.current?.todosSilenciados ?? false;
  const audioAlgumSilenciado = controleAudio.current?.algumSilenciado ?? false;
  const audioIdsSilenciados = controleAudio.current?.idsSilenciados ?? [];

  // Entrada: o ouvinte registra presença; o anfitrião registra o palco.
  React.useEffect(() => {
    if (!sala.sala) return;
    let cancelado = false;
    const entrar = async () => {
        setEntrando(true);
        try {
        if (isHost) {
          await registrarAnfitriao(sala.sala!);
        } else {
          await entrarComoOuvinte(liveId);
        }
        // Recarga explícita após o registro: em rede móvel o
        // evento de Realtime pode não chegar, e sem a própria
        // linha na lista o anfitrião ficava sem microfone e
        // sem controles.
        await sala.recarregarParticipantes();
        } catch (e) {
          const codigo = e instanceof Error ? e.message : "";
          if (cancelado) return;
          // `ja_participa` não é falha: a presença já consta no banco e
          // a sala abre normalmente. Qualquer outro código é real e precisa
          // chegar ao usuário — silenciar aqui deixava a tela sem nenhuma
          // explicação quando o registro não ocorria.
          if (codigo === "ja_participa") {
            console.info("[LiveRoomView] entrada: participação já existente");
          } else {
            console.error("[LiveRoomView] entrada:", codigo);
            const descricao = descreverErroLive(codigo, "Não foi possível entrar nesta sala.");
            toast({
              title: descricao.titulo,
              description: descricao.mensagem,
              variant: descricao.recuperavel ? "default" : "destructive",
            });
          }
        } finally {
          // Encerra em todos os caminhos: sucesso, `ja_participa`,
          // erro inesperado e falha de RLS na consulta.
          if (!cancelado) setEntrando(false);
        }
      };
    void entrar();
    return () => {
      cancelado = true;
    };
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
      // A UI do anfitrião não fica esperando o evento: o resultado já vem
      // persistido, então recarregar agora torna "Aceitar" imediato mesmo
      // que o canal esteja se recuperando.
      await Promise.all([sala.recarregarSolicitacoes(), sala.recarregarParticipantes()]);
      toast({ title: "Participante autorizado" });
    } catch (e) {
      const codigo = e instanceof Error ? e.message : "";
      const d = descreverErroLive(codigo);
      toast({ title: d.titulo, description: d.mensagem, variant: "destructive" });
    }
  };

  const acao = async (
    participante: LiveParticipante,
    tipo: "silenciar" | "remover" | "bloquear",
  ) => {
    // "Silenciar" alterna: se a pessoa já estava silenciada, a mesma
    // devolve a palavra. Um botão que só sabe silenciar obrigaria o
    // anfitrião a adivinhar como reverter.
    const efetivo =
      tipo === "silenciar" && participante.silenciado_pelo_anfitriao
        ? "permitir_falar"
        : tipo;

    const nome = participante.nome_exibicao;
    const feedback: Record<string, { titulo: string; descricao: string }> = {
      silenciar: {
        titulo: "Microfone silenciado",
        descricao: `${nome} foi silenciado. O áudio foi interrompido e o card mostra o estado.`,
      },
      permitir_falar: {
        titulo: "Áudio liberado",
        descricao: `${nome} pode falar novamente.`,
      },
      remover: {
        titulo: "Participante removido",
        descricao: `${nome} saiu da cadeira e o microfone foi desligado.`,
      },
      bloquear: {
        titulo: "Participante bloqueado",
        descricao: `${nome} foi bloqueado nesta Live e o microfone foi desligado.`,
      },
    };

    try {
      await acaoSobreParticipante(participante.id, efetivo);
      await sala.recarregarParticipantes();
      const fb = feedback[efetivo];
      toast({ title: fb.titulo, description: fb.descricao });
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

  /**
   * Compartilhamento de tela do anfitrião.
   *
   * Uma única implementação para os dois pontos de entrada: o botão
   * da barra de controles e o atalho de `LivePresentation`. Reaproveita
   * o `getDisplayMedia` já existente em `iniciarCompartilhamento` e
   * registra a apresentação como tipo "screen" pelo mesmo caminho de
   * `iniciarTela`, sem uma segunda forma de fazer o mesmo registro.
   *
   * A ordem importa. O registro no banco e a troca de modo só acontecem
   * DEPOIS que a captura é concedida: se a pessoa cancelar a seleção de
   * janela, não pode sobrar uma apresentação "screen" fantasma nem a
   * sala presa em modo apresentação sem vídeo nenhum.
   *
   * O áudio não é tocado. `alternarModo` altera apenas `live_rooms`;
   * a sala LiveKit continua montada e o microfone segue publicado.
   */
  const compartilharTela = async () => {
    // iOS Safari e vários navegadores móveis não expõem
    // `getDisplayMedia`. Falhar em silêncio deixava o botão
    // "morto": o usuário não sabia que o caminho era enviar
    // um arquivo. O aviso diz exatamente isso.
    if (!publicacao.suportaTela) {
      toast({
        title: "Compartilhamento indisponível",
        description:
          "Este dispositivo não permite compartilhar a tela. Use “Enviar PDF ou vídeo” para apresentar.",
        variant: "destructive",
      });
      return false;
    }
    const tracks = await publicacao.iniciarCompartilhamento();
    if (!tracks) {
      toast({
        title: "Compartilhamento cancelado",
        description: "Nenhuma tela foi selecionada. Nenhuma alteração foi feita.",
      });
      return false;
    }

    await apresentacao.iniciarTela();
    if (modo !== "apresentacao") {
      await alternarModo();
    }
    return true;
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
              {podeControlarAudio && (
                <LiveAudioControlePonte reportar={reportarControleAudio} />
              )}
              <div className="space-y-4">
                {modo === "apresentacao" && (
                  <LivePresentation
                    apresentacao={apresentacao.apresentacao}
                    url={apresentacao.url}
                    souAnfitriao={isHost}
                    modo={modo}
                    tela={publicacao.tela}
                    onMudarPagina={(p) => void apresentacao.irParaPagina(p)}
                    onRegistrarTotal={(t) => void apresentacao.definirTotalPaginas(t)}
                    onSincronizarVideo={(r, t) => void apresentacao.sincronizarReproducao(r, t)}
                    onEncerrar={() => void alternarModo()}
                    onSelecionarArquivo={
                      isHost
                        ? async (f) => {
                            publicacao.setErroApresentacao(null);
                            await apresentacao.abrirArquivo(f);
                          }
                        : undefined
                    }
                    onIniciarTela={
                      isHost
                        ? () => {
                            void compartilharTela();
                          }
                        : undefined
                    }
                    erro={apresentacao.erro ?? publicacao.erroApresentacao}
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
                isHost || permissoes.isAdmin
                  ? (p) => ({
                      silenciar: () => void acao(p, "silenciar"),
                      remover: () => void acao(p, "remover"),
                      bloquear: () => void acao(p, "bloquear"),
                      alternarAudio: () => controleAudio.current?.alternarParticipante(p.id),
                    })
                  : undefined
              }
              podeSilenciarAudio={podeControlarAudio}
              audioSilenciado={
                podeControlarAudio
                  ? (id) => controleAudio.current?.estaSilenciado(id) === true
                  : () => false
              }
                  podePublicar={emCadeira}
                  microfoneAtivo={publicacao.microfoneAtivo}
                  fluxoLocal={fluxoLocal}
                />
              </div>
            </SalaMidia>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-xl border">
              <Button
                onClick={() => void credencial.conectar()}
                disabled={credencial.carregando || entrando}
              >
                {credencial.carregando || entrando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                {entrando ? "Registrando presença…" : "Entrar na sala de áudio"}
              </Button>
            </div>
          )}

          {/* Controles — fixos na parte inferior no celular
              para que microfone, apresentação e encerramento
              fiquem sempre ao alcance, sem precisar rolar. */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:shadow-lg">
            {isHost ? (
              <>
                {/* Requisito 3: o anfitrião ocupa a cadeira 0 e é dono
                    da sala, então precisa do mesmo controle de microfone
                    que os participantes tinham — antes ele só aparecia no
                    ramo não-anfitrião e o anfitrião ficava sem ação. */}
                {emCadeira && status !== "encerrada" && (
                  <Button
                    size="sm"
                    variant={publicacao.microfoneAtivo ? "default" : "outline"}
                    onClick={() => void alternarMicrofone()}
                    disabled={publicacao.microfoneAtivo === false && silenciadoPeloAnfitriao}
                  >
                    {publicacao.microfoneAtivo ? (
                      <Mic className="mr-2 h-4 w-4" />
                    ) : (
                      <MicOff className="mr-2 h-4 w-4" />
                    )}
                    {publicacao.microfoneAtivo ? "Desligar microfone" : "Ligar microfone"}
                  </Button>
                )}
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
                      onClick={() => void compartilharTela()}
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
                      disabled={publicacao.microfoneAtivo === false && silenciadoPeloAnfitriao}
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

          {/* Requisito 2: mute coletivo do áudio da apresentação */}
          {podeControlarAudio && status !== "encerrada" && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Áudio da apresentação</span>

              <Button
                size="sm"
                variant={audioTodosSilenciados ? "destructive" : "outline"}
                onClick={() => {
                  const alvo = controleAudio.current;
                  if (!alvo) {
                    toast({
                      title: "Sala de áudio ainda não conectada",
                      description:
                        "Entre na sala de áudio para poder silenciar a apresentação.",
                    });
                    return;
                  }
                  alvo.alternarTodos();
                }}
                disabled={!controleAudio.current}
                aria-pressed={audioTodosSilenciados}
              >
                {audioTodosSilenciados ? (
                  <VolumeX className="mr-2 h-4 w-4" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )}
                {audioTodosSilenciados ? "Restaurar áudio" : "Silenciar para todos"}
              </Button>

              <span className="text-xs text-muted-foreground">
                {audioConectados === 0
                  ? "Ninguém conectado à sala de áudio ainda."
                  : audioTodosSilenciados
                    ? `Todos os ${audioConectados} participante(s) estão sem áudio.`
                    : audioAlgumSilenciado
                      ? `${audioIdsSilenciados.length} de ${audioConectados} sem áudio. Use os botões nas cadeiras para ajustar.`
                      : `${audioConectados} participante(s) ouvindo.`}
              </span>
            </div>
          )}

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
