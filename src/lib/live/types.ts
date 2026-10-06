export type LiveStatus = "aguardando" | "ao_vivo" | "apresentacao" | "encerrada";
export type LiveModo = "audio" | "apresentacao";
export type LiveTipoParticipante = "anfitriao" | "participante" | "ouvinte" | "convidado";
export type LiveTipoApresentacao = "pdf" | "video" | "screen";
export type LiveSolicitacaoStatus = "pendente" | "aceita" | "recusada" | "cancelada";
export type LiveMensagemTipo = "texto" | "presente" | "sistema";

export const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  aguardando: "Aguardando",
  ao_vivo: "Ao vivo",
  apresentacao: "Apresentação",
  encerrada: "Encerrada",
};

export const LIVE_TIPO_LABEL: Record<LiveTipoParticipante, string> = {
  anfitriao: "Anfitrião",
  participante: "Participante",
  ouvinte: "Ouvinte",
  convidado: "Convidado",
};

export const LIVE_SOLICITACAO_LABEL: Record<LiveSolicitacaoStatus, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

export const LIVE_CADERAS_PADRAO = 8;
export const LIVE_MAX_CADEIRAS = 50;
export const LIVE_MENSAGEM_MAX = 500;

export type LiveRoom = {
  id: string;
  titulo: string;
  descricao: string;
  anfitriao_id: string;
  status: LiveStatus;
  modo: LiveModo;
  livekit_room: string;
  max_cadeiras: number;
  iniciada_em: string | null;
  encerrada_em: string | null;
  created_at: string;
  updated_at: string;
};

export type LiveParticipante = {
  id: string;
  live_id: string;
  usuario_id: string | null;
  convidado_hash: string | null;
  nome_exibicao: string;
  perfil: string | null;
  tipo: LiveTipoParticipante;
  cadeira: number | null;
  microfone_ativo: boolean;
  camera_ativa: boolean;
  /**
   * Mute IMPOSTO pelo anfitrião. Distinto de `microfone_ativo`,
   * que é o que o próprio participante realmente publikou: o
   * primeiro é uma ordem, o segundo é um fato. O painel do
   * anfitrião só pode mostrar "ligado" quando os dois concordam.
   */
  silenciado_pelo_anfitriao: boolean;
  bloqueado: boolean;
  saiu_em: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type LiveSolicitacao = {
  id: string;
  live_id: string;
  usuario_id: string;
  status: LiveSolicitacaoStatus;
  created_at: string;
  respondida_em: string | null;
  respondido_por: string | null;
  nome_exibicao?: string;
  perfil?: string | null;
};

export type LiveConvite = {
  id: string;
  live_id: string;
  token_hash: string;
  rotulo: string;
  criado_por: string;
  expira_em: string;
  limite_acessos: number | null;
  acessos: number;
  revogado: boolean;
  ultimo_acesso_em: string | null;
  created_at: string;
  updated_at: string;
};

export type LiveConviteAcesso = {
  id: string;
  convite_id: string;
  nome_exibicao: string;
  user_agent: string;
  ip_hash: string;
  entrou_em: string;
  saiu_em: string | null;
};

export type LiveMensagem = {
  id: string;
  live_id: string;
  autor_usuario_id: string | null;
  autor_convidado_hash: string | null;
  nome_exibicao: string;
  perfil: string | null;
  mensagem: string;
  tipo: LiveMensagemTipo;
  created_at: string;
};

export type LivePresenteCategoria = {
  id: string;
  nome: string;
  slug: string;
  emoji: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type LivePresenteSubcategoria = {
  id: string;
  categoria_id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
};

export type LivePresente = {
  id: string;
  categoria_id: string;
  subcategoria_id: string | null;
  nome: string;
  valor_credito: number;
  imagem_path: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type LivePresenteEnvio = {
  id: string;
  live_id: string;
  presente_id: string | null;
  categoria_id: string | null;
  categoria_nome: string;
  presente_nome: string;
  remetente_usuario_id: string | null;
  remetente_convidado_hash: string | null;
  destinatario_participante_id: string;
  valor_credito_representado: number;
  created_at: string;
};

export type LiveApresentacao = {
  id: string;
  live_id: string;
  tipo: LiveTipoApresentacao;
  anexo_id: string | null;
  caminho: string;
  mime_type: string;
  titulo: string;
  pagina_atual: number;
  total_paginas: number;
  reproduzindo: boolean;
  tempo_atual_segundos: number;
  iniciado_em: string;
  encerrada_em: string | null;
  iniciado_por: string | null;
  created_at: string;
  updated_at: string;
};

/** Motivo pelo qual um convite externo deixou de funcionar. */
export type LiveConviteErro =
  | "convite_inexistente"
  | "convite_revogado"
  | "convite_expirado"
  | "limite_acessos"
  | "live_encerrada"
  | "configuracao_invalida";

/** Convite validado, pronto para renderizar a sala externa. */
export type LiveConviteValido = {
  live_id: string;
  convite_id: string;
  status: LiveStatus;
  modo: LiveModo;
  titulo: string;
  descricao: string;
  anfitriao_nome: string;
  /** Nome de exibição informado pelo convidado. */
  nome_convidado: string;
};
