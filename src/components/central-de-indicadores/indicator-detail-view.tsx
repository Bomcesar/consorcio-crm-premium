"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndicatorDetailActions } from "@/components/central-de-indicadores/indicator-detail-actions";
import { useIndicadores } from "@/hooks/use-indicadores";
import type { Indicator } from "@/types/crm";

type IndicatorDetailViewProps = {
  indicatorId: string;
  initialIndicator: Indicator | null;
};

export function IndicatorDetailView({ indicatorId, initialIndicator }: IndicatorDetailViewProps) {
  const { listIndicators } = useIndicadores();
  const [indicator, setIndicator] = useState<Indicator | null>(initialIndicator);
  const [isLoading, setIsLoading] = useState(!initialIndicator);

  useEffect(() => {
    let isMounted = true;

    const loadIndicator = async () => {
      setIsLoading(!initialIndicator);

      try {
        const indicators = await listIndicators();
        if (!isMounted) return;

        const matched = indicators.find((item) => item.id === indicatorId);
        if (matched) {
          setIndicator(matched);
          return;
        }

        if (!initialIndicator) {
          setIndicator(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadIndicator();

    return () => {
      isMounted = false;
    };
  }, [indicatorId, initialIndicator, listIndicators]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Carregando indicador...</h2>
            <p className="text-sm text-muted-foreground">Buscando dados salvos na central.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/central-de-indicadores">Voltar para a central</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Indicador não encontrado</h2>
            <p className="text-sm text-muted-foreground">Esse cadastro não foi localizado nem no Supabase nem no armazenamento local.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/central-de-indicadores">Voltar para a central</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{indicator.nome}</h2>
          <p className="text-sm text-muted-foreground">Perfil profissional do indicador</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/central-de-indicadores">Voltar para a central</Link>
        </Button>
      </div>

      <IndicatorDetailActions indicator={indicator} />

      <Card className="border-border/50 bg-card/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {indicator.nome
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0] ?? "")
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-lg">{indicator.nome}</CardTitle>
                <p className="text-sm text-muted-foreground">{indicator.profissao || "Profissão não informada"}</p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              {indicator.status || "Novo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Telefone</p>
              <p className="text-base">{indicator.telefone || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
              <p className="text-base">{indicator.whatsapp || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cidade</p>
              <p className="text-base">{indicator.cidade || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Origem</p>
              <p className="text-base">{indicator.origem || "-"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-base">{indicator.status || "Novo"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entrou em</p>
              <p className="text-base">{indicator.data_entrada || "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ativo</p>
              <p className="text-base">{indicator.ativo ? "Sim" : "Não"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Observações</p>
              <p className="text-base">{indicator.observacoes || "Sem observações"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Contatos", value: "0" },
          { title: "Reuniões", value: "0" },
          { title: "Vendas", value: "0" },
          { title: "Comissões", value: "0" },
        ].map((item) => (
          <Card key={item.title} className="border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}