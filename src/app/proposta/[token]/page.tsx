import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Calendar, Copy, CheckCircle2, Share2 } from "lucide-react";

interface PropostaView {
  id: string;
  titulo: string;
  tipo: string;
  conteudo: string;
  acessos: number;
  data_envio: string | null;
  created_at: string;
  banner_caminho?: string | null;
}

const formatPropostaTipo = (tipo: string) => {
  switch (tipo) {
    case "Imovel":
      return "Imóvel";
    case "Veiculo":
      return "Veículo";
    case "Servicos":
      return "Serviços";
    case "Outros bens moveis":
      return "Outros bens móveis";
    default:
      return tipo;
  }
};

export default function PropostaPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [proposta, setProposta] = useState<PropostaView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProposta = async () => {
      try {
        const response = await fetch(`/api/propostas/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error("Erro ao carregar proposta");
        }
        const data = (await response.json()) as PropostaView;
        setProposta(data);
      } catch {
        notFound();
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProposta();
  }, [token]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!proposta) return;
    const text = encodeURIComponent(`${proposta.titulo}\n\n${proposta.conteudo}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (!proposta) {
    notFound();
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-3xl px-4">
        <Card className="border-border/50 bg-card/80 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{proposta.titulo}</CardTitle>
                <CardDescription>
                  {formatPropostaTipo(proposta.tipo)}
                </CardDescription>
              </div>
              <Badge variant="default">{formatPropostaTipo(proposta.tipo)}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {proposta.banner_caminho && (
              <img
                src={proposta.banner_caminho}
                alt="Banner da proposta"
                className="w-full rounded-lg border"
              />
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Criada em: {new Date(proposta.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              {proposta.data_envio && (
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Enviada em: {new Date(proposta.data_envio).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{proposta.acessos} visualização(es)</span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border bg-white p-6">
              {proposta.conteudo.split("\n").map((line, i) => (
                <div key={i}>{line || "\u00A0"}</div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 border-t pt-4">
              <Button onClick={handleCopy} variant="outline" size="sm">
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar link
                  </>
                )}
              </Button>
              <Button onClick={handleWhatsAppShare} size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar no WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
