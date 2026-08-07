import { getErrorMessage } from "@/lib/errors";
import { appLog } from "@/lib/logger";
import {
  listWhatsAppConversationsRepository,
  listWhatsAppMessagesRepository,
  listWhatsAppTemplatesRepository,
  registerWhatsAppInboundRepository,
  sendWhatsAppMessageRepository,
  updateWhatsAppConversationRepository,
} from "@/repositories/whatsapp.repository";
import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppRegisterInboundInput,
  WhatsAppSendMessageInput,
  WhatsAppTemplate,
} from "@/types/crm";

export async function listWhatsAppConversationsService(): Promise<WhatsAppConversation[]> {
  try {
    return await listWhatsAppConversationsRepository();
  } catch (error) {
    appLog("error", "whatsapp.listConversations.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar as conversas do WhatsApp."));
  }
}

export async function listWhatsAppMessagesService(conversationId: string): Promise<WhatsAppMessage[]> {
  try {
    return await listWhatsAppMessagesRepository(conversationId);
  } catch (error) {
    appLog("error", "whatsapp.listMessages.failed", { error, conversationId });
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar as mensagens do WhatsApp."));
  }
}

export async function sendWhatsAppMessageService(input: WhatsAppSendMessageInput): Promise<WhatsAppMessage> {
  try {
    return await sendWhatsAppMessageRepository(input);
  } catch (error) {
    appLog("error", "whatsapp.sendMessage.failed", { error, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel registrar o envio da mensagem."));
  }
}

export async function registerWhatsAppInboundService(input: WhatsAppRegisterInboundInput): Promise<WhatsAppMessage> {
  try {
    return await registerWhatsAppInboundRepository(input);
  } catch (error) {
    appLog("error", "whatsapp.registerInbound.failed", { error, input });
    throw new Error(getErrorMessage(error, "Nao foi possivel registrar a resposta recebida."));
  }
}

export async function updateWhatsAppConversationService(
  conversationId: string,
  updates: Partial<Pick<WhatsAppConversation, "status" | "pinned">>,
): Promise<void> {
  try {
    await updateWhatsAppConversationRepository(conversationId, updates);
  } catch (error) {
    appLog("error", "whatsapp.updateConversation.failed", { error, conversationId, updates });
    throw new Error(getErrorMessage(error, "Nao foi possivel atualizar a conversa do WhatsApp."));
  }
}

export async function listWhatsAppTemplatesService(): Promise<WhatsAppTemplate[]> {
  try {
    return await listWhatsAppTemplatesRepository();
  } catch (error) {
    appLog("error", "whatsapp.listTemplates.failed", error);
    throw new Error(getErrorMessage(error, "Nao foi possivel carregar os modelos de mensagem."));
  }
}