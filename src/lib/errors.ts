export class AppError extends Error {
  code: string;

  constructor(message: string, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown };

    if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
      return candidate.message;
    }

    if (typeof candidate.error === "string" && candidate.error.trim().length > 0) {
      return candidate.error;
    }

    if (typeof candidate.details === "string" && candidate.details.trim().length > 0) {
      return candidate.details;
    }

    if (typeof candidate.hint === "string" && candidate.hint.trim().length > 0) {
      return candidate.hint;
    }
  }
  return fallback;
}
