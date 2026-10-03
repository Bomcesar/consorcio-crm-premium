"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLiveToast } from "./use-live-toast";
import { LIVE_CADERAS_PADRAO, LIVE_MAX_CADEIRAS, LIVE_STATUS_LABEL } from "@/lib/live/types";
import { formatDataHora } from "@/lib/live/format";
import {
  criarLive,
  entrarComoOuvinte,
  getHistoricoLives,
  getLivesAtivas,
} from "@/repositories/client/live/live.repository";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";
import { getNavItemsForRole } from "@/config/navigation";
import { Radio, Users, Loader2, History } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

/**
 * 🎙️ HUB DA LIVE DE VOZ
 * Criar live, entrar como ouvinte e consultar histórico.
 */
export function LiveHub() {
  const toast = useLiveToast();

  const [perfil, setPerfil] = React.useState<string | undefined>(undefined);
  const [podeIniciar, setPodeIniciar] = React.useState(false);
  const [titulo, setTitulo] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [cadeiras, setCadeiras] = React.useState(LIVE_CADERAS_PADRAO);

  const [ativas, setAtivas] = React.useState<Awaited<ReturnType<typeof getLivesAtivas>>>([]);
  const [historico, setHistorico] = React.useState<Awaited<ReturnType<typeof getHistoricoLives>>>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [criando, setCriando] = React.useState(false);
  const [entrandoEm, setEntrandoEm] = React.useState<string | null>(null);

  React.useEffect(() => {
    const carregar = async () => {
      try {
        const user = await getAuthenticatedUser();
        setPerfil(user.perfil);
        setPodeIniciar(hasPermission(user, "live.iniciar") || hasPermission(user, "live.acessar"));

        const [a, h] = await Promise.all([getLivesAtivas(), getHistoricoLives(10)]);
        setAtivas(a);
        setHistorico(h.filter((l) => l.status === "encerrada"));
      } catch (e) {
        console.error("[LiveHub]:", e);
      } finally {
        setCarregando(false);
      }
    };
    void carregar();
  }, []);

  const podeVerMenu = getNavItemsForRole(perfil).some((i) => i.href === "/live-voz");

  const criar = async () => {
    setCriando(true);
    try {
      const live = await criarLive({
        titulo,
        descricao,
        max_cadeiras: Math.min(Math.max(1, cadeiras), LIVE_MAX_CADEIRAS),
      });
      window.location.href = `/live-voz/${live.id}`;
    } catch (e) {
      toast({
        title: "Não foi possível criar a Live",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCriando(false);
    }
  };

  const entrar = async (liveId: string) => {
    setEntrandoEm(liveId);
    try {
      await entrarComoOuvinte(liveId);
      window.location.href = `/live-voz/${liveId}`;
    } catch (e) {
      toast({
        title: "Não foi possível entrar",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setEntrandoEm(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 text-primary" /> Live de Voz
        </h1>
        <p className="text-sm text-muted-foreground">
          Sala de áudio ao vivo com cadeiras, chat, convidados externos e presentes.
        </p>
      </div>

      {carregando ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      ) : (
        <>
          {podeIniciar && podeVerMenu && (
            <Card>
              <CardHeader>
                <CardTitle>🎙️ Iniciar nova Live</CardTitle>
                <CardDescription>
                  Você será o anfitrião e controlará as cadeiras, o chat, os convidados e a
                  apresentação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex.: Live de abertura — Grupo 42"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Label htmlFor="cadeiras">Cadeiras</Label>
                  <Input
                    id="cadeiras"
                    type="number"
                    min={1}
                    max={LIVE_MAX_CADEIRAS}
                    value={cadeiras}
                    onChange={(e) => setCadeiras(Number(e.target.value))}
                  />
                </div>
                <Button onClick={() => void criar()} disabled={criando}>
                  {criando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Radio className="mr-2 h-4 w-4" />
                  )}
                  Criar sala
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Lives disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ativas.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma Live no momento.
                </p>
              ) : (
                ativas.map((live) => (
                  <div
                    key={live.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{live.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {LIVE_STATUS_LABEL[live.status as keyof typeof LIVE_STATUS_LABEL] ??
                          live.status}{" "}
                        · {live.max_cadeiras} cadeiras · {formatDataHora(live.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={live.status === "ao_vivo" ? "default" : "secondary"}>
                        {LIVE_STATUS_LABEL[live.status as keyof typeof LIVE_STATUS_LABEL] ??
                          live.status}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => void entrar(live.id)}
                        disabled={entrandoEm === live.id}
                      >
                        {entrandoEm === live.id && (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        )}
                        Entrar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {historico.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {historico.map((live) => (
                  <Link
                    key={live.id}
                    href={`/live-voz/${live.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <span className="truncate text-sm">{live.titulo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDataHora(live.encerrada_em ?? live.created_at)}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
