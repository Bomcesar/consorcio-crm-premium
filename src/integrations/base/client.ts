import { logError, logInfo, logWarn } from "./logger";
import {
  AuthenticationError,
  IntegrationError,
  RateLimitError,
  UpstreamError,
} from "./errors";

export type HttpClientOptions = {
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

type RequestOptions = {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.defaultHeaders = options.headers ?? {};
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  async request<T>({ path, method = "GET", body, headers, timeoutMs }: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        logInfo(`http ${method} ${url}`, { attempt: attempt + 1 });

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...this.defaultHeaders,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          cache: "no-store",
          next: { revalidate: 0 },
        });

        clearTimeout(timeoutId);

        const isSuccess = response.ok;
        const contentType = response.headers.get("content-type") ?? "";
        const isJson = contentType.includes("application/json");

        if (!isSuccess) {
          const retryAfter = response.headers.get("retry-after");
          const parsedRetryAfter = retryAfter ? Number(retryAfter) : undefined;

          if (response.status === 401) {
            throw new AuthenticationError(
              `Autenticação inválida para ${url}.`,
              await this.extractErrorMessage(response, isJson),
            );
          }

          if (response.status === 429) {
            throw new RateLimitError(
              `Rate limit atingido para ${url}.`,
              Number.isFinite(parsedRetryAfter) ? parsedRetryAfter : undefined,
              await this.extractErrorMessage(response, isJson),
            );
          }

          const text = await this.extractErrorMessage(response, isJson);
          const error = new UpstreamError(
            `Erro ${response.status} em ${url}: ${text}`,
            response.status,
            text,
          );

          if (this.shouldRetry(response.status, attempt)) {
            logWarn(`Retryable error ${response.status}`, { url, attempt, retryAfter: parsedRetryAfter });
            await this.delay(parsedRetryAfter ?? this.retryDelayMs);
            lastError = error;
            continue;
          }

          throw error;
        }

        const data = isJson ? await response.json() : (await response.text());

        logInfo(`http ${method} ${url} success`, { status: response.status });
        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof IntegrationError) {
          if (error instanceof RateLimitError && error.retryAfter && attempt < this.retries) {
            logWarn(`Rate limited, retrying after ${error.retryAfter}s`, { url, attempt });
            await this.delay(error.retryAfter * 1000);
            lastError = error;
            continue;
          }

          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          logError(`Timeout em ${url}`, { timeoutMs });
          lastError = new UpstreamError(`Timeout em ${url}.`, 504, error);
          if (attempt < this.retries) {
            await this.delay(this.retryDelayMs);
            continue;
          }
          throw lastError;
        }

        lastError = error instanceof Error ? error : new Error(String(error));
        logError(`Falha em requisição para ${url}`, {
          attempt: attempt + 1,
          message: lastError.message,
        });

        if (attempt < this.retries) {
          await this.delay(this.retryDelayMs);
          continue;
        }

        throw new UpstreamError(`Falha ao comunicar com ${url}.`, 502, lastError);
      }
    }

    throw lastError ?? new UpstreamError(`Falha ao comunicar com ${url}.`, 502);
  }

  private async extractErrorMessage(
    response: Response,
    isJson: boolean,
  ): Promise<string> {
    try {
      if (isJson) {
        const json = await response.json();
        if (typeof json === "object" && json !== null) {
          const maybeMessage = (json as Record<string, unknown>).message;
          if (typeof maybeMessage === "string") return maybeMessage;
        }
        return JSON.stringify(json);
      }
      return await response.text();
    } catch {
      return `HTTP ${response.status}`;
    }
  }

  private shouldRetry(status: number, attempt: number): boolean {
    if (attempt >= this.retries) return false;
    return [429, 500, 502, 503, 504].includes(status);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
