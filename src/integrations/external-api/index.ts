import { assertEnv, externalApiEnv } from "../env-validation";
import { HttpClient } from "../base/client";
import { IntegrationError, UpstreamError, ValidationError } from "../base/errors";

export type ExternalApiClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

export class ExternalApiClient {
  private readonly http: HttpClient;

  constructor(options: ExternalApiClientOptions = {}) {
    const env = externalApiEnv();
    const baseUrl = options.baseUrl || env.baseUrl;
    const apiKey = options.apiKey || env.apiKey;

    if (!baseUrl) {
      throw new ValidationError(
        "URL base da API externa não definida. Verifique EXTERNAL_API_BASE_URL.",
      );
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const timeoutMs = options.timeoutMs
      ? Number(options.timeoutMs)
      : env.timeoutMs
        ? Number(env.timeoutMs)
        : 15000;

    this.http = new HttpClient({
      baseUrl,
      headers,
      timeoutMs,
      retries: options.retries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 1000,
    });
  }

  static validateEnv() {
    assertEnv(externalApiEnv(), "External API");
  }

  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const queryString = query
      ? `?${new URLSearchParams(query).toString()}`
      : "";
    try {
      return await this.http.request<T>({ path: `${path}${queryString}`, method: "GET" });
    } catch (error) {
      throw this.normalizeError(error, "get");
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    try {
      return await this.http.request<T>({ path, method: "POST", body });
    } catch (error) {
      throw this.normalizeError(error, "post");
    }
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    try {
      return await this.http.request<T>({ path, method: "PUT", body });
    } catch (error) {
      throw this.normalizeError(error, "put");
    }
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    try {
      return await this.http.request<T>({ path, method: "PATCH", body });
    } catch (error) {
      throw this.normalizeError(error, "patch");
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      return await this.http.request<T>({ path, method: "DELETE" });
    } catch (error) {
      throw this.normalizeError(error, "delete");
    }
  }

  private normalizeError(error: unknown, operation: string): IntegrationError {
    if (error instanceof IntegrationError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new UpstreamError(`Falha em ${operation} da API externa: ${message}`, 502, error);
  }
}
