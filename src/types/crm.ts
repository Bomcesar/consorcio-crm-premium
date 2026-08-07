export type Lead = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Parceiro = {
  id: string;
  nome: string;
  empresa: string;
  segmento: string;
  telefone: string;
  email: string;
  cidade: string;
  status: string;
  nivel_parceria: string;
  comissao_percentual: number;
  ultimo_contato?: string | null;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RecrutamentoCandidato = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  vaga_interesse: string;
  etapa: string;
  fonte: string;
  score_aderencia: number;
  disponibilidade_inicio?: string | null;
  status: string;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Indicator = {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  nome: string;
  telefone: string;
  whatsapp?: string | null;
  email: string;
  cidade: string;
  estado: string;
  cpf: string;
  pix: string;
  origem: string;
  profissao?: string | null;
  data_entrada?: string | null;
  status: string;
  observacoes: string;
  ativo: boolean;
  usuario_id: string;
};

export type IndicatorFormData = {
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  cpf: string;
  pix: string;
  origem: string;
  profissao: string;
  data_entrada: string;
  status: string;
  observacoes: string;
  ativo: boolean;
};

export type Contact = {
  id: string;
  indicador_id: string;
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
  created_at?: string | null;
  updated_at?: string | null;
  usuario_id: string;
};

export type ContactFormData = {
  nome: string;
  telefone: string;
  cidade: string;
  status: string;
  observacoes: string;
};

export type Commission = {
  id: string;
  indicador_id: string;
  valor: number;
  status: string;
  pix: string;
  data_pagamento?: string | null;
  observacoes: string;
  usuario_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Agenda = {
  id: string;
  usuario_id: string;
  indicador_id?: string | null;
  cliente_id?: string | null;
  indicador_nome?: string | null;
  cliente_nome?: string | null;
  titulo: string;
  descricao: string;
  data_hora: string;
  duracao_minutos: number;
  tipo: string;
  status: string;
  local_online: string;
  notas_conclusao: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DashboardScheduleItem = {
  id: string;
  time: string;
  title: string;
  type: string;
  origin: "Indicador" | "Pós-venda";
  originLabel: string;
};

export type DashboardStat = {
  title: string;
  value: number;
  change: string;
  trend: "up" | "down";
  description: string;
  isCurrency?: boolean;
};

export type DashboardActivity = {
  id: string;
  client: string;
  action: string;
  type: string;
  value: string;
  time: string;
};

export type PipelineStage = {
  name: string;
  count: number;
  color: string;
  width: string;
};

export type DashboardData = {
  stats: DashboardStat[];
  activities: DashboardActivity[];
  pipeline: PipelineStage[];
  upcomingSchedule: DashboardScheduleItem[];
};

export type WhatsAppConversationStatus = "Novo" | "Em atendimento" | "Aguardando retorno" | "Concluido";

export type WhatsAppConversation = {
  id: string;
  contact_id: string;
  contact_name: string;
  phone: string;
  city: string;
  source: "Indicador";
  status: WhatsAppConversationStatus;
  pinned: boolean;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
};

export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppMessage = {
  id: string;
  conversation_id: string;
  content: string;
  direction: WhatsAppMessageDirection;
  created_at: string;
  status: "pendente" | "enviado" | "lido";
  author_name: string;
};

export type WhatsAppTemplate = {
  id: string;
  title: string;
  content: string;
};

export type WhatsAppSendMessageInput = {
  conversation_id: string;
  content: string;
  author_name: string;
};

export type WhatsAppRegisterInboundInput = {
  conversation_id: string;
  content: string;
  author_name: string;
};

export type PosVendaStatus = "Boas-vindas" | "Acompanhamento" | "Renovacao" | "Suporte" | "Concluido";

export type PosVendaPriority = "Baixa" | "Media" | "Alta";

export type PosVendaRecord = {
  id: string;
  usuario_id: string;
  cliente_id: string;
  agenda_id?: string | null;
  cliente_nome: string;
  telefone: string;
  cidade: string;
  status: PosVendaStatus;
  priority: PosVendaPriority;
  satisfaction: number;
  next_contact_at: string | null;
  last_contact_at: string | null;
  channel: string;
  needs_attention: boolean;
  observacoes: string;
  created_at: string | null;
  updated_at: string | null;
};

export type PosVendaUpsertInput = {
  usuario_id: string;
  cliente_id: string;
  cliente_nome: string;
  telefone: string;
  cidade: string;
  status: PosVendaStatus;
  priority: PosVendaPriority;
  satisfaction: number;
  next_contact_at: string | null;
  last_contact_at: string | null;
  channel: string;
  needs_attention: boolean;
  observacoes: string;
};

export type UserSettings = {
  id: string;
  usuario_id: string;
  calendar_integration_enabled: boolean;
  calendar_email: string;
  whatsapp_integration_enabled: boolean;
  whatsapp_webhook_url: string;
  whatsapp_api_key: string;
  notification_email: boolean;
  notification_whatsapp: boolean;
  language: string;
  page_size: number;
  default_indicator_status: string;
  compact_sidebar: boolean;
  auto_refresh_dashboard: boolean;
  dashboard_refresh_seconds: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserSettingsFormData = {
  nome: string;
  email: string;
  avatar_url: string;
  perfil: string;
  calendar_integration_enabled: boolean;
  calendar_email: string;
  whatsapp_integration_enabled: boolean;
  whatsapp_webhook_url: string;
  whatsapp_api_key: string;
  notification_email: boolean;
  notification_whatsapp: boolean;
  language: string;
  page_size: number;
  default_indicator_status: string;
  compact_sidebar: boolean;
  auto_refresh_dashboard: boolean;
  dashboard_refresh_seconds: number;
};
