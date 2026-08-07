import { listIndicatorsRepository } from "@/repositories/indicadores.repository";
import type {
  Indicator,
  WhatsAppConversation,
  WhatsAppConversationStatus,
  WhatsAppMessage,
  WhatsAppRegisterInboundInput,
  WhatsAppSendMessageInput,
  WhatsAppTemplate,
} from "@/types/crm";

const CONVERSATIONS_KEY = "crm-whatsapp-conversations-local";
const MESSAGES_KEY = "crm-whatsapp-messages-local";

type ConversationMeta = {
  id: string;
  contact_id: string;
  status: WhatsAppConversationStatus;
  pinned: boolean;
  updated_at: string;
};

function readLocalJson<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeLocalJson<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readConversationMeta(): ConversationMeta[] {
  return readLocalJson<ConversationMeta>(CONVERSATIONS_KEY);
}

function writeConversationMeta(value: ConversationMeta[]) {
  writeLocalJson(CONVERSATIONS_KEY, value);
}

function readMessages(): WhatsAppMessage[] {
  return readLocalJson<WhatsAppMessage>(MESSAGES_KEY);
}

function writeMessages(value: WhatsAppMessage[]) {
  writeLocalJson(MESSAGES_KEY, value);
}

function sanitizePhone(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

function buildConversationId(indicatorId: string) {
  return `indicator-${indicatorId}`;
}

function getLatestMessage(messages: WhatsAppMessage[], conversationId: string) {
  return messages
    .filter((message) => message.conversation_id === conversationId)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0];
}

function getUnreadCount(messages: WhatsAppMessage[], conversationId: string) {
  return messages.filter((message) => message.conversation_id === conversationId && message.direction === "inbound" && message.status !== "lido").length;
}

function ensureConversationMeta(contactId: string): ConversationMeta {
  const current = readConversationMeta();
  const existing = current.find((item) => item.contact_id === contactId);
  if (existing) return existing;

  const next: ConversationMeta = {
    id: buildConversationId(contactId),
    contact_id: contactId,
    status: "Novo",
    pinned: false,
    updated_at: new Date().toISOString(),
  };

  writeConversationMeta([...current, next]);
  return next;
}

function mergeConversations(indicators: Indicator[], meta: ConversationMeta[], messages: WhatsAppMessage[]): WhatsAppConversation[] {
  return indicators
    .filter((indicator) => sanitizePhone(indicator.whatsapp || indicator.telefone).length >= 10)
    .map((indicator) => {
      const conversationId = buildConversationId(indicator.id);
      const conversationMeta = meta.find((item) => item.contact_id === indicator.id) ?? {
        id: conversationId,
        contact_id: indicator.id,
        status: "Novo" as const,
        pinned: false,
        updated_at: indicator.updated_at ?? indicator.created_at ?? new Date().toISOString(),
      };
      const latestMessage = getLatestMessage(messages, conversationId);

      return {
        id: conversationId,
        contact_id: indicator.id,
        contact_name: indicator.nome,
        phone: sanitizePhone(indicator.whatsapp || indicator.telefone),
        city: indicator.cidade,
        source: "Indicador" as const,
        status: conversationMeta.status,
        pinned: conversationMeta.pinned,
        last_message: latestMessage?.content ?? "Sem mensagens ainda",
        last_message_at: latestMessage?.created_at ?? indicator.updated_at ?? indicator.created_at ?? null,
        unread_count: getUnreadCount(messages, conversationId),
      };
    })
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      const leftTime = left.last_message_at ? new Date(left.last_message_at).getTime() : 0;
      const rightTime = right.last_message_at ? new Date(right.last_message_at).getTime() : 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return left.contact_name.localeCompare(right.contact_name, "pt-BR");
    });
}

export async function listWhatsAppConversationsRepository(): Promise<WhatsAppConversation[]> {
  const indicators = await listIndicatorsRepository();
  const meta = readConversationMeta();
  const messages = readMessages();

  return mergeConversations(indicators, meta, messages);
}

export async function listWhatsAppMessagesRepository(conversationId: string): Promise<WhatsAppMessage[]> {
  return readMessages()
    .filter((message) => message.conversation_id === conversationId)
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
}

export async function sendWhatsAppMessageRepository(input: WhatsAppSendMessageInput): Promise<WhatsAppMessage> {
  const message: WhatsAppMessage = {
    id: `message-${crypto.randomUUID()}`,
    conversation_id: input.conversation_id,
    content: input.content,
    direction: "outbound",
    created_at: new Date().toISOString(),
    status: "enviado",
    author_name: input.author_name,
  };

  const messages = [...readMessages(), message];
  writeMessages(messages);

  const conversationId = input.conversation_id.replace(/^indicator-/, "");
  const currentMeta = readConversationMeta();
  const ensured = ensureConversationMeta(conversationId);
  writeConversationMeta(
    currentMeta.some((item) => item.contact_id === conversationId)
      ? currentMeta.map((item) =>
          item.contact_id === conversationId
            ? { ...item, status: "Em atendimento", updated_at: message.created_at }
            : item,
        )
      : [{ ...ensured, status: "Em atendimento", updated_at: message.created_at }, ...currentMeta],
  );

  return message;
}

export async function registerWhatsAppInboundRepository(input: WhatsAppRegisterInboundInput): Promise<WhatsAppMessage> {
  const message: WhatsAppMessage = {
    id: `message-${crypto.randomUUID()}`,
    conversation_id: input.conversation_id,
    content: input.content,
    direction: "inbound",
    created_at: new Date().toISOString(),
    status: "lido",
    author_name: input.author_name,
  };

  const messages = [...readMessages(), message];
  writeMessages(messages);

  const conversationId = input.conversation_id.replace(/^indicator-/, "");
  const currentMeta = readConversationMeta();
  const ensured = ensureConversationMeta(conversationId);
  writeConversationMeta(
    currentMeta.some((item) => item.contact_id === conversationId)
      ? currentMeta.map((item) =>
          item.contact_id === conversationId
            ? { ...item, status: "Aguardando retorno", updated_at: message.created_at }
            : item,
        )
      : [{ ...ensured, status: "Aguardando retorno", updated_at: message.created_at }, ...currentMeta],
  );

  return message;
}

export async function updateWhatsAppConversationRepository(
  conversationId: string,
  updates: Partial<Pick<WhatsAppConversation, "status" | "pinned">>,
): Promise<void> {
  const contactId = conversationId.replace(/^indicator-/, "");
  const currentMeta = readConversationMeta();
  const existing = currentMeta.find((item) => item.contact_id === contactId) ?? ensureConversationMeta(contactId);
  const next: ConversationMeta = {
    ...existing,
    status: updates.status ?? existing.status,
    pinned: updates.pinned ?? existing.pinned,
    updated_at: new Date().toISOString(),
  };

  writeConversationMeta(
    currentMeta.some((item) => item.contact_id === contactId)
      ? currentMeta.map((item) => (item.contact_id === contactId ? next : item))
      : [...currentMeta, next],
  );
}

export async function listWhatsAppTemplatesRepository(): Promise<WhatsAppTemplate[]> {
  return [
    {
      id: "follow-up",
      title: "Follow-up comercial",
      content: "Olá! Passando para dar continuidade ao nosso atendimento e verificar seu interesse.",
    },
    {
      id: "meeting",
      title: "Convite para reunião",
      content: "Olá! Podemos agendar uma reunião rápida para apresentar as melhores opções para você?",
    },
    {
      id: "documents",
      title: "Solicitação de documentos",
      content: "Para avançarmos, preciso que me envie os documentos necessários. Posso te orientar no processo.",
    },
    {
      id: "reactivation",
      title: "Reativação de contato",
      content: "Olá! Retomei seu atendimento para entender se ainda faz sentido seguirmos com a proposta.",
    },
  ];
}