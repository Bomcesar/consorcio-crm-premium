export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(message = "Falha na autenticação com o serviço externo.", cause?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, cause);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends IntegrationError {
  constructor(
    message = "Limite de requisições excedido.",
    public readonly retryAfter?: number,
    cause?: unknown,
  ) {
    super(message, "RATE_LIMIT_ERROR", 429, cause);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends IntegrationError {
  constructor(message = "Dados inválidos para a integração.", cause?: unknown) {
    super(message, "VALIDATION_ERROR", 400, cause);
    this.name = "ValidationError";
  }
}

export class UpstreamError extends IntegrationError {
  constructor(message = "Erro no serviço externo.", statusCode = 502, cause?: unknown) {
    super(message, "UPSTREAM_ERROR", statusCode, cause);
    this.name = "UpstreamError";
  }
}
