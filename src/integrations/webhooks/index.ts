import { logError, logInfo, logWarn } from "../base/logger";
import { assertEnv, webhookEnv } from "../env-validation";

export type WebhookPayload = Record<string, unknown>;

export type WebhookDeliveryResult = {
  url: string;
  status: number;
  success: boolean;
  durationMs: number;
  error?: string;
};

export type WebhookOptions = {
  secret?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export class WebhookClient {
  private readonly secret: string;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(options: WebhookOptions = {}) {
    const env = webhookEnv();
    this.secret = options.secret || env.secret || "";
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 2000;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  static validateEnv() {
    assertEnv(webhookEnv(), "Webhooks");
  }

  async send(url: string, payload: WebhookPayload): Promise<WebhookDeliveryResult> {
    const start = Date.now();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.secret) {
      headers["X-Webhook-Secret"] = this.secret;
    }

    let lastError: string | undefined;
    let status = 0;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        logInfo(`webhook send ${url}`, { attempt: attempt + 1, maxRetries: this.maxRetries });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: "no-store",
          next: { revalidate: 0 },
        });

        clearTimeout(timeoutId);
        status = response.status;

        const durationMs = Date.now() - start;

        if (response.ok) {
          logInfo(`webhook success ${url}`, { status, durationMs });
          return { url, status, success: true, durationMs };
        }

        lastError = `HTTP ${status}`;
        logWarn(`webhook failed ${url}`, { status, attempt, durationMs });

        if (attempt < this.maxRetries && this.isRetryable(status)) {
          await this.delay(this.retryDelayMs * (attempt + 1));
          continue;
        }

        return { url, status, success: false, durationMs, error: lastError };
      } catch (error) {
        const durationMs = Date.now() - start;
        lastError = error instanceof Error ? error.message : String(error);
        logError(`webhook error ${url}`, { attempt: attempt + 1, message: lastError });

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * (attempt + 1));
          continue;
        }

        return {
          url,
          status: status || 0,
          success: false,
          durationMs,
          error: lastError,
        };
      }
    }

    return {
      url,
      status,
      success: false,
      durationMs: Date.now() - start,
      error: lastError,
    };
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    if (!this.secret) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(this.secret);
      const payloadData = encoder.encode(payload);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, payloadData);
      const expected = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return signature === expected;
    } catch {
      return false;
    }
  }

  private isRetryable(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
