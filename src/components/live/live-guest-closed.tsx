import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";

const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  live_encerrada: {
    titulo: "Esta Live foi encerrada",
    texto: "O link de acesso não é mais válido. Entre em contato com o anfitrião se precisar de uma nova Live.",
  },
  convite_expirado: {
    titulo: "Link expirado",
    texto: "Este link de convite expirou. Peça um novo link ao anfitrião.",
  },
  convite_revogado: {
    titulo: "Convite revogado",
    texto: "O anfitrião revogou este convite. O link não é mais válido.",
  },
  limite_acessos: {
    titulo: "Limite de acessos atingido",
    texto: "Este link já foi utilizado o número máximo de vezes permitido.",
  },
  convite_inexistente: {
    titulo: "Link inválido",
    texto: "Este link de convite não existe. Confira o endereço recebido.",
  },
};

/** Página de link inválido/expirado para o convidado externo. */
export function LiveGuestClosed({ erro }: { erro: string }) {
  const mensagem = MENSAGENS[erro] ?? MENSAGENS.convite_inexistente;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Radio className="h-5 w-5 text-muted-foreground" />
            {mensagem.titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{mensagem.texto}</p>
        </CardContent>
      </Card>
    </div>
  );
}
