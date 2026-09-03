import { assertEnv, whatsappEnv } from "../env-validation";
import { HttpClient } from "../base/client";
import { IntegrationError, UpstreamError, ValidationError } from "../base/errors";

export type WhatsAppMessageInput = {
  to: string;
  message: string;
};

export type WhatsAppMediaInput = {
  to: string;
  mediaType: "image" | "audio" | "video" | "document" | "pdf";
  link: string;
  caption?: string;
};

export type WhatsAppMessageResponse = {
  messagingProduct: string;
  contacts: { input: string; waId: string }[];
  messages: { id: string }[];
};

export type WhatsAppServiceOptions = {
  apiUrl?: string;
  apiToken?: string;
  phoneNumberId?: string;
};

export class WhatsAppService {
  private readonly http: HttpClient;

  constructor(options: WhatsAppServiceOptions = {}) {
    const env = whatsappEnv();
    const apiUrl = options.apiUrl || env.apiUrl;
    const apiToken = options.apiToken || env.apiToken;
    const phoneNumberId = options.phoneNumberId || env.phoneNumberId;

    if (!apiUrl || !apiToken || !phoneNumberId) {
      throw new ValidationError(
        "Configuração do WhatsApp incompleta. Verifique WHATSAPP_API_URL, WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID.",
      );
    }

    this.http = new HttpClient({
      baseUrl: apiUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      timeoutMs: 20000,
      retries: 2,
      retryDelayMs: 1000,
    });
  }

  static validateEnv() {
    assertEnv(whatsappEnv(), "WhatsApp");
  }

   async sendMessage(input: WhatsAppMessageInput): Promise<WhatsAppMessageResponse> {
    this.validateInput(input);

    try {
      const response = await this.http.request<WhatsAppMessageResponse>({
        path: "",
        method: "POST",
        body: {
          messaging_product: "whatsapp",
          to: this.normalizePhone(input.to),
          type: "text",
          text: { body: input.message },
        },
      });

      return response;
    } catch (error) {
      throw this.normalizeError(error, "sendMessage");
    }
  }

  async sendMedia(input: WhatsAppMediaInput): Promise<WhatsAppMessageResponse> {
    if (!input.to?.trim()) {
      throw new ValidationError("Destinatário é obrigatório.");
    }
    if (!input.link?.trim()) {
      throw new ValidationError("Link é obrigatório.");
    }

    const mediaType = input.mediaType === "pdf" ? "document" : input.mediaType;

    try {
      const response = await this.http.request<WhatsAppMessageResponse>({
        path: "",
        method: "POST",
        body: {
          messaging_product: "whatsapp",
          to: this.normalizePhone(input.to),
          type: mediaType,
          [mediaType]: {
            link: input.link,
            ...(input.caption ? { caption: input.caption } : {}),
          },
        },
      });

      return response;
    } catch (error) {
      throw this.normalizeError(error, "sendMedia");
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = "pt_BR",
    components?: unknown[],
  ): Promise<WhatsAppMessageResponse> {
    const normalizedTo = this.normalizePhone(to);

    try {
      const response = await this.http.request<WhatsAppMessageResponse>({
        path: "",
        method: "POST",
        body: {
          messaging_product: "whatsapp",
          to: normalizedTo,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        },
      });

      return response;
    } catch (error) {
      throw this.normalizeError(error, "sendTemplateMessage");
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      throw new ValidationError("Número de telefone inválido.");
    }
    return digits;
  }

  private validateInput(input: WhatsAppMessageInput) {
    if (!input.to?.trim()) {
      throw new ValidationError("Destinatário é obrigatório.");
    }
    if (!input.message?.trim()) {
      throw new ValidationError("Mensagem é obrigatória.");
    }
  }

  private normalizeError(error: unknown, operation: string): IntegrationError {
    if (error instanceof IntegrationError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new UpstreamError(`Falha em ${operation} do WhatsApp: ${message}`, 502, error);
  }
}
