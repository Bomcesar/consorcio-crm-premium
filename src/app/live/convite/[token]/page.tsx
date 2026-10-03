import { validarConvite } from "@/lib/live/server-convite";
import { LiveGuestClosed } from "@/components/live/live-guest-closed";

/**
 * Rota pública de convidado: /live/convite/[TOKEN]
 *
 * Fica FORA do grupo (dashboard): sem sidebar, sem cabeçalho do
 * CRM e sem acesso a nenhuma tabela interna. O acesso depende
 * exclusivamente da validade do token, verificada no servidor.
 */
export default async function LiveConvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ nome?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;

  const resultado = await validarConvite(token);

  if (!resultado.ok) {
    return <LiveGuestClosed erro={resultado.erro} />;
  }

  const dados = resultado.dados;
  const nomeInicial = (query.nome ?? "").trim().slice(0, 80);

  const { LiveGuestRoom } = await import("@/components/live/live-guest-room");

  return (
    <LiveGuestRoom
      token={token}
      nomeInicial={nomeInicial}
      dados={{
        titulo: dados.titulo,
        descricao: dados.descricao,
        anfitriao: dados.anfitriao_nome,
        status: dados.status,
        modo: dados.modo === "apresentacao" ? "apresentacao" : "audio",
      }}
    />
  );
}
