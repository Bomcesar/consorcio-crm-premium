import { assertEnv, storageEnv } from "../env-validation";
import { HttpClient } from "../base/client";
import { IntegrationError, UpstreamError, ValidationError } from "../base/errors";

export type StorageUploadInput = {
  bucket: string;
  path: string;
  content: Buffer | Uint8Array;
  contentType?: string;
  metadata?: Record<string, string>;
};

export type StorageUploadResult = {
  bucket: string;
  path: string;
  publicUrl: string;
  size: number;
};

export type StorageServiceOptions = {
  provider?: string;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  endpoint?: string;
};

export class StorageService {
  private readonly http: HttpClient;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(options: StorageServiceOptions = {}) {
    const env = storageEnv();
    const provider = options.provider || env.provider || "supabase";
    const bucket = options.bucket || env.bucket || "crm-files";
    const accessKey = options.accessKey || env.accessKey;
    const secretKey = options.secretKey || env.secretKey;
    const endpoint = options.endpoint || env.endpoint;

    if (!accessKey || !secretKey) {
      throw new ValidationError(
        "Configuração de storage incompleta. Verifique STORAGE_ACCESS_KEY e STORAGE_SECRET_KEY.",
      );
    }

    this.bucket = bucket;
    this.baseUrl = endpoint || `https://${bucket}.${provider}.com`;
    this.http = new HttpClient({
      baseUrl: this.baseUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`${accessKey}:${secretKey}`).toString("base64")}`,
      },
      timeoutMs: 60000,
      retries: 2,
      retryDelayMs: 1000,
    });
  }

  static validateEnv() {
    assertEnv(storageEnv(), "Storage");
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const bucket = input.bucket || this.bucket;
    const path = input.path.replace(/^\//, "");

    if (!path) {
      throw new ValidationError("Caminho do arquivo é obrigatório.");
    }

    try {
      await this.http.request<unknown>({
        path: `/${bucket}/${encodeURIComponent(path)}`,
        method: "PUT",
        body: Buffer.isBuffer(input.content)
          ? input.content
          : new Uint8Array(input.content),
        headers: {
          "Content-Type": input.contentType || "application/octet-stream",
          "x-upsert": "true",
          ...(input.metadata
            ? { "x-amz-meta-": JSON.stringify(input.metadata) }
            : {}),
        },
      });

      const size = Buffer.isBuffer(input.content)
        ? input.content.length
        : input.content.length;

      return {
        bucket,
        path,
        publicUrl: `${this.baseUrl}/${bucket}/${encodeURIComponent(path)}`,
        size,
      };
    } catch (error) {
      throw this.normalizeError(error, "upload");
    }
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    const normalizedPath = path.replace(/^\//, "");
    return `${this.baseUrl}/${bucket}/${encodeURIComponent(normalizedPath)}`;
  }

  private normalizeError(error: unknown, operation: string): IntegrationError {
    if (error instanceof IntegrationError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new UpstreamError(`Falha em ${operation} do Storage: ${message}`, 502, error);
  }
}
