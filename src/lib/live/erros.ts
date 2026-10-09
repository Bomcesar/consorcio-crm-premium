import type { LiveConviteErro, LiveStatus } from "./types";

/**
 * Catálogo único de erros da sala. Toda falha de mídia, permissão,
 * token ou estado tem uma mensagem clara e uma ação associada.
 */
export const LIVE_ERROS: Record<
  string,
  { titulo: string; mensagem: string; recuperavel: boolean }
> = {
  microfone_negado: {
    titulo: "Microfone bloqueado",
    mensagem:
      "O navegador não liberou o microfone. Clique no ícone de cadeado da barra de endereço, permita o microfone e tente novamente.",
    recuperavel: true,
  },
  camera_negada: {
    titulo: "Câmera bloqueada",
    mensagem:
      "O navegador não liberou a câmera. Permita o acesso nas configurações do site para usar a apresentação em vídeo.",
    recuperavel: true,
  },
  tela_compartilhamento_negado: {
    titulo: "Compartilhamento cancelado",
    mensagem: "Você cancelou o compartilhamento de tela. Nenhuma alteração foi feita.",
    recuperavel: true,
  },
  tela_nao_suportada: {
    titulo: "Compartilhamento indisponível",
    mensagem:
      "Este navegador não permite compartilhamento de tela. Use o Chrome ou Edge no computador, ou apresente um PDF ou vídeo.",
    recuperavel: true,
  },
  navegador_incompativel: {
    titulo: "Navegador não compatível",
    mensagem:
      "Seu navegador não suporta os recursos necessários para áudio e vídeo em tempo real. Atualize para uma versão recente ou use o Chrome ou Edge.",
    recuperavel: false,
  },
  audio_sem_dispositivo: {
    titulo: "Áudio indisponível",
    mensagem:
      "Nenhum microfone foi encontrado. Conecte um microfone ou fone de ouvido e tente novamente.",
    recuperavel: true,
  },
  falha_conexao_media: {
    titulo: "Conexão de mídia interrompida",
    mensagem:
      "A conexão de áudio ou vídeo foi perdida. Estamos tentando reconectar — permaneça nesta tela.",
    recuperavel: true,
  },
  limite_conexoes: {
    titulo: "Limite de conexões atingido",
    mensagem:
      "O serviço de áudio e vídeo atingiu o limite de uso deste período e não aceita novas conexões. Peça ao administrador da Live para verificar a capacidade da plataforma.",
    recuperavel: false,
  },
  falha_emissao_token: {
    titulo: "Não foi possível entrar na sala",
    mensagem:
      "O serviço de áudio e vídeo não liberou seu acesso. Tente novamente em alguns instantes.",
    recuperavel: true,
  },
  live_encerrada: {
    titulo: "Esta Live foi encerrada",
    mensagem: "Esta Live foi encerrada. O link de acesso não é mais válido.",
    recuperavel: false,
  },
  ja_participa: {
    titulo: "Você já está na sala",
    mensagem: "Sua presença já está registrada nesta Live.",
    recuperavel: false,
  },
  conflito_registro: {
    titulo: "Conflito de registro",
    mensagem: "Este registro já existe. Atualize a sala e tente novamente.",
    recuperavel: true,
  },
  convite_expirado: {
    titulo: "Link expirado",
    mensagem: "Este link de convite expirou. Peça um novo link ao anfitrião.",
    recuperavel: false,
  },
  convite_revogado: {
    titulo: "Convite revogado",
    mensagem: "O anfitrião revogou este convite. O link não é mais válido.",
    recuperavel: false,
  },
  limite_acessos: {
    titulo: "Limite de acessos atingido",
    mensagem: "Este link já foi utilizado o número máximo de vezes permitido.",
    recuperavel: false,
  },
  cadeira_indisponivel: {
    titulo: "Nenhuma cadeira disponível",
    mensagem: "Todas as cadeiras estão ocupadas no momento. Tente novamente em instantes.",
    recuperavel: true,
  },
  solicitacao_duplicada: {
    titulo: "Solicitação já enviada",
    mensagem: "Você já solicitou para falar. Aguarde a resposta do anfitrião.",
    recuperavel: true,
  },
  bloqueado_na_live: {
    titulo: "Acesso bloqueado nesta Live",
    mensagem: "O anfitrião bloqueou seu acesso a esta Live.",
    recuperavel: false,
  },
  sessao_expirada: {
    titulo: "Sessão expirada",
    mensagem: "Sua sessão expirou. Entre novamente para continuar.",
    recuperavel: false,
  },
  falha_carregamento: {
    titulo: "Não foi possível carregar",
    mensagem: "Houve uma falha ao carregar os dados da sala. Tente novamente.",
    recuperavel: true,
  },
  falha_apresentacao: {
    titulo: "Falha na apresentação",
    mensagem:
      "Não foi possível abrir o arquivo de apresentação. Verifique se o arquivo está disponível e tente novamente.",
    recuperavel: true,
  },
  link_nao_suportado: {
    titulo: "Link não suportado",
    mensagem:
      "Este link não pode virar apresentação. Use um arquivo do Google Drive ou uma URL direta de PDF, MP4 ou WebM. Documentos do Google precisam ser exportados como PDF primeiro.",
    recuperavel: true,
  },
  link_drive_negado: {
    titulo: "Link do Drive bloqueado",
    mensagem:
      "O Google Drive não liberou o download deste arquivo. Verifique se o compartilhamento está público ou envie o arquivo diretamente.",
    recuperavel: true,
  },
  arquivo_grande: {
    titulo: "Arquivo muito grande",
    mensagem: "O limite é de 100 MB. Envie um arquivo menor ou use um link direto.",
    recuperavel: true,
  },
  falha_envio_presente: {
    titulo: "Não foi possível enviar o presente",
    mensagem: "Tente novamente em alguns instantes.",
    recuperavel: true,
  },
  sem_permissao: {
    titulo: "Acesso negado",
    mensagem: "Você não tem permissão para realizar esta ação.",
    recuperavel: false,
  },
};

export function descreverErroLive(codigo: string | null | undefined, fallback?: string) {
  const base = codigo ? LIVE_ERROS[codigo] : undefined;
  return (
    base ?? {
      titulo: "Ocorreu um problema",
      mensagem: fallback ?? "Não foi possível concluir a operação. Tente novamente.",
      recuperavel: true,
    }
  );
}

const CODIGOS_CONVIDE: Record<LiveConviteErro, string> = {
  convite_inexistente: "convite_revogado",
  convite_revogado: "convite_revogado",
  convite_expirado: "convite_expirado",
  limite_acessos: "limite_acessos",
  live_encerrada: "live_encerrada",
  configuracao_invalida: "convite_revogado",
};

export function mapearErroConvite(codigo: LiveConviteErro | string): string {
  return CODIGOS_CONVIDE[codigo as LiveConviteErro] ?? "convite_revogado";
}

export function erroLiveAtivo(status: LiveStatus): boolean {
  return status === "ao_vivo" || status === "apresentacao";
}

/** Mapeia mensagens nativas de getUserMedia para o catálogo. */
export function mapearErroDeMidia(erro: unknown): string {
  const nome = (erro as { name?: string })?.name ?? "";
  switch (nome) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "microfone_negado";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "audio_sem_dispositivo";
    case "NotReadableError":
    case "TrackStartError":
      return "falha_conexao_media";
    case "AbortError":
      return "tela_compartilhamento_negado";
    default:
      return "falha_conexao_media";
  }
}

/**
 * Classifica falhas de conexão com a sala LiveKit.
 *
 * O WebSocket do navegador não expõe o status HTTP do handshake, e o
 * livekit-client só traduz 401/403/404 do endpoint de validação —
 * um 429 de cota do LiveKit Cloud chega como erro genérico de
 * WebSocket. Quando o erro não carrega o status, sonda o próprio
 * endpoint de validação (`/rtc/v1/validate`) com o token da sala:
 * ele é público (CORS `*`) e devolve 429 com a mensagem de cota
 * quando o projeto estourou os minutos de conexão do período.
 */
export async function classificarFalhaDeConexao(
  erro: unknown,
  serverUrl: string,
  token: string,
): Promise<string> {
  const status = (erro as { status?: number })?.status;
  if (status === 429) return "limite_conexoes";

  const mensagem = String((erro as { message?: string })?.message ?? "");
  if (/connection minutes|too many requests|rate limit|quota/i.test(mensagem)) {
    return "limite_conexoes";
  }

  if (serverUrl && token) {
    const controle = new AbortController();
    const tempoLimite = setTimeout(() => controle.abort(), 5000);
    try {
      const httpUrl = serverUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
      const resposta = await fetch(
        `${httpUrl.replace(/\/$/, "")}/rtc/v1/validate?access_token=${encodeURIComponent(token)}`,
        { cache: "no-store", signal: controle.signal },
      );
      if (resposta.status === 429) return "limite_conexoes";
    } catch {
      // Servidor inacessível: mantém a classificação genérica.
    } finally {
      clearTimeout(tempoLimite);
    }
  }

  return "falha_conexao_media";
}

/** O suporte a compartilhamento de tela varia muito entre navegadores. */
export function suportaCompartilhamentoDeTela(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator.mediaDevices as { getDisplayMedia?: unknown })?.getDisplayMedia === "function"
  );
}

/** iOS exige playsInline e gesto do usuário para liberar áudio. */
export function suportaReproducaoInline(): boolean {
  if (typeof document === "undefined") return true;
  const video = document.createElement("video");
  return "playsInline" in video;
}
