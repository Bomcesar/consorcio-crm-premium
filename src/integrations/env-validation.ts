const REQUIRED = "Variável de ambiente obrigatória não definida:";

export type EnvValidationResult =
  | { valid: true }
  | { valid: false; missing: string[] };

export function validateEnv(vars: Record<string, string | undefined>): EnvValidationResult {
  const missing = Object.entries(vars)
    .filter(([, value]) => !value || value.trim() === "")
    .map(([key]) => key);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

export function assertEnv(vars: Record<string, string | undefined>, label: string) {
  const result = validateEnv(vars);
  if (!result.valid) {
    const details = result.missing.join(", ");
    throw new Error(`${REQUIRED} ${details} para ${label}`);
  }
}

export const googleCalendarEnv = () => ({
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
});

export const whatsappEnv = () => ({
  apiUrl: process.env.WHATSAPP_API_URL,
  apiToken: process.env.WHATSAPP_API_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
});

export const storageEnv = () => ({
  provider: process.env.STORAGE_PROVIDER,
  bucket: process.env.STORAGE_BUCKET,
  region: process.env.STORAGE_REGION,
  accessKey: process.env.STORAGE_ACCESS_KEY,
  secretKey: process.env.STORAGE_SECRET_KEY,
  endpoint: process.env.STORAGE_ENDPOINT,
});

export const webhookEnv = () => ({
  secret: process.env.WEBHOOK_SECRET,
  baseUrl: process.env.WEBHOOK_BASE_URL,
});

export const externalApiEnv = () => ({
  baseUrl: process.env.EXTERNAL_API_BASE_URL,
  apiKey: process.env.EXTERNAL_API_KEY,
  timeoutMs: process.env.EXTERNAL_API_TIMEOUT_MS,
});
