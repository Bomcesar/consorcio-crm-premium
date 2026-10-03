"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Loader2, ShieldAlert, Users } from "lucide-react";
import { useTracks, VideoTrack } from "@livekit/components-react";
import { Track } from "livekit-client";
import { LiveGuestChat } from "./live-guest-chat";
import { LiveGuestPresentation } from "./live-guest-presentation";
import { SalaMidia } from "./live-room";

export type SessaoConvidado = {
  liveId: string;
  status: string;
  modo: "audio" | "apresentacao";
  titulo: string;
  descricao: string;
  anfitriao: string;
  nome: string;
  identidade: string;
  tokenLivekit: string;
  urlLivekit: string;
};

type Props = {
  token: string;
  nomeInicial: string;
  dados: {
    titulo: string;
    descricao: string;
    anfitriao: string;
    status: string;
    modo: "audio" | "apresentacao";
  };
};

const NOME_KEY = "live_convidado_nome";

/**
 * Sala do convidado externo.
 *
 * Não há sessão Supabase, não há acesso a nenhuma tabela do CRM e
 * não há permissão de publicar mídia: o token LiveKit recebido
 * tem canPublish: false. O convidado ouve, assiste e usa o chat.
 */
export function LiveGuestRoom({ token, nomeInicial, dados }: Props) {
  const [nome, setNome] = React.useState(nomeInicial);
  const [sessao, setSessao] = React.useState<SessaoConvidado | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [encerrada, setEncerrada] = React.useState(dados.status === "encerrada");

  // Só há sessão depois que o acesso é registrado no servidor.
  const confirmado = sessao !== null;

  const entrar = React.useCallback(
    async (nomeInformado: string) => {
      const nomeLimpo = nomeInformado.trim();
      if (!nomeLimpo) return;

      setCarregando(true);
      setErro(null);
      try {
        // `entrar=1`: registra o acesso e emite o token de mídia.
        // A validação do convite é feita pelo servidor, e o
        // `limite_acessos` é consumido uma única vez, na entrada.
        const resposta = await fetch(
          `/api/live/convite/${token}?entrar=1&nome=${encodeURIComponent(nomeLimpo)}`,
          { cache: "no-store" },
        );
        const corpo = (await resposta.json().catch(() => null)) as
          | (SessaoConvidado & { erro?: string })
          | null;

        if (!resposta.ok || !corpo?.tokenLivekit) {
          setErro(corpo?.erro ?? "convite_inexistente");
          if (resposta.status === 403) setEncerrada(true);
          return;
        }

        try {
          window.localStorage.setItem(NOME_KEY, nomeLimpo);
        } catch {
          /* modo privativo: o nome não precisa ser lembrado */
        }
        setSessao(corpo);
      } catch {
        setErro("convite_inexistente");
      } finally {
        setCarregando(false);
      }
    },
    [token],
  );

  // Convite já vem com o nome preenchido: entra direto, sem
  // mostrar formulário. O acesso só é contado uma vez.
  React.useEffect(() => {
    if (nomeInicial && !sessao && !carregando) void entrar(nomeInicial);
    // Executa apenas na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revalidação periódica do convite durante a transmissão.
  // É validação leve (sem `entrar=1`): NÃO registra acesso nem
  // consome `limite_acessos`; apenas detecta revogação,
  // expiração ou encerramento da sala.
  React.useEffect(() => {
    if (!confirmado) return;
    const checar = async () => {
      try {
        const resposta = await fetch(`/api/live/convite/${token}`, {
          method: "GET",
          cache: "no-store",
        });
        if (resposta.status === 403) {
          setEncerrada(true);
          return;
        }
        if (!resposta.ok) return;

        // A validação leve também devolve o modo atual: quando o
        // anfitrião entra ou sai da apresentação, o convidado
        // acompanha sem precisar abrir o link de novo.
        const corpo = (await resposta.json().catch(() => null)) as
          | { status?: string; modo?: string }
          | null;
        if (corpo?.status || corpo?.modo) {
          setSessao((atual) =>
            atual
              ? {
                  ...atual,
                  status: corpo.status ?? atual.status,
                  modo: corpo.modo === "apresentacao" ? "apresentacao" : ("audio" as const),
                }
              : atual,
          );
        }
      } catch {
        /* mantém a sessão atual */
      }
    };
    const intervalo = setInterval(() => void checar(), 60000);
    return () => clearInterval(intervalo);
  }, [confirmado, token]);

  if (encerrada) {
    return <SalaEncerrada />;
  }

  if (!confirmado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" /> {dados.titulo || "Live"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você foi convidado para assistir e participar do chat desta Live com{" "}
              <strong>{dados.anfitriao}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="nome-convidado">Nome para exibição</Label>
              <Input
                id="nome-convidado"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como você aparece no chat"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                Usamos apenas este nome. Não é necessário criar conta.
              </p>
            </div>
            {erro && (
              <p className="flex items-start gap-1 text-sm text-destructive">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {erro === "convite_expirado" && "Este link expirou. Peça um novo ao anfitrião."}
                {erro === "convite_revogado" && "O anfitrião revogou este convite."}
                {erro === "limite_acessos" && "Este link já foi utilizado o máximo de vezes."}
                {erro === "live_encerrada" && "Esta Live foi encerrada."}
                {erro === "convite_inexistente" && "Link de convite inválido."}
              </p>
            )}
            <Button className="w-full" onClick={() => void entrar(nome)} disabled={!nome.trim() || carregando}>
              {carregando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Entrar na Live
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate font-bold">
              <Radio className="h-5 w-5 text-primary" /> {dados.titulo || "Live"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {dados.anfitriao} · {dados.modo === "apresentacao" ? "Apresentação" : "Live de áudio"}
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            conectado
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {sessao ? (
          <>
            <SalaMidiaConvidada sessao={sessao} />
            <LiveGuestPresentation token={token} ativo={sessao.modo === "apresentacao"} />
            <LiveGuestChat
              token={token}
              nome={nome.trim()}
              liveId={sessao.liveId}
            />
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Preparando a sala de áudio...
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Você está como convidado. Pode assistir e participar do chat. Para subir para uma cadeira,
          solicite ao anfitrião durante a Live pelo CRM.
        </p>
      </main>
    </div>
  );
}

function SalaEncerrada() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Esta Live foi encerrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O link de acesso não é mais válido. Entre em contato com o anfitrião se precisar de
            uma nova Live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SalaMidiaConvidada({ sessao }: { sessao: SessaoConvidado }) {
  const [conectado, setConectado] = React.useState(false);

  return (
    <SalaMidia
      token={sessao.tokenLivekit}
      serverUrl={sessao.urlLivekit}
      // Convidados NUNCA capturam microfone, câmera ou tela:
      // além de ser desnecessário, o token LiveKit chega com
      // canPublish: false e o servidor recusaria a publicação.
      audio={false}
      video={false}
      screen={false}
      onConnected={() => setConectado(true)}
    >
      <div className="rounded-xl border bg-card p-4">
        <PalcoDoConvidado conectado={conectado} modo={sessao.modo} />
      </div>
    </SalaMidia>
  );
}

/**
 * Palco do convidado: reproduce o vídeo da câmera e a tela
 * compartilhada do anfitrião. O áudio chega pelo RoomAudioRenderer
 * dentro de `SalaMidia`.
 */
function PalcoDoConvidado({
  conectado,
  modo,
}: {
  conectado: boolean;
  modo: "audio" | "apresentacao";
}) {
  const visoes = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Camera, withPlaceholder: false },
  ]).filter(
    (visao): visao is typeof visao & { publication: NonNullable<typeof visao.publication> } =>
      Boolean(visao.publication),
  );

  return (
    <div className="space-y-4">
      {visoes.length > 0 ? (
        <div className="grid gap-3">
          {visoes.map((visao) => (
            <div key={visao.publication?.trackSid ?? visao.participant.identity}>
              <VideoTrack
                trackRef={visao}
                className="w-full rounded-lg bg-black"
                style={{ aspectRatio: "16 / 9" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 p-6 text-center">
          <Loader2
            className={`h-7 w-7 text-primary ${conectado ? "hidden" : "animate-spin"}`}
          />
          <p className="font-medium">
            {conectado ? "Você está ouvindo a Live" : "Conectando ao áudio..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {modo === "apresentacao"
              ? "Quando o anfitrião iniciar a apresentação, o vídeo aparece aqui."
              : "Use fone de ouvido para melhor qualidade de áudio."}
          </p>
        </div>
      )}
    </div>
  );
}
