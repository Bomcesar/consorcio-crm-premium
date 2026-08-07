import { useMemo } from "react";
import {
  listWhatsAppConversationsService,
  listWhatsAppMessagesService,
  listWhatsAppTemplatesService,
  registerWhatsAppInboundService,
  sendWhatsAppMessageService,
  updateWhatsAppConversationService,
} from "@/services/whatsapp.service";

export function useWhatsApp() {
  return useMemo(
    () => ({
      listConversations: listWhatsAppConversationsService,
      listMessages: listWhatsAppMessagesService,
      sendMessage: sendWhatsAppMessageService,
      registerInbound: registerWhatsAppInboundService,
      updateConversation: updateWhatsAppConversationService,
      listTemplates: listWhatsAppTemplatesService,
    }),
    [],
  );
}