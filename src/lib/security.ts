const ALLOWED_SCHEMES = new Set(["https", "http"]);
const BLOCKED_HOST_SUBSTRINGS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.",
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168.",
];

export function isUrlAllowed(url: string): boolean {
  let parsed: URL | null;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol.replace(":", ""))) {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  return !BLOCKED_HOST_SUBSTRINGS.some((sub) => host.includes(sub));
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Erro interno.";
  }
  return "Erro interno.";
}
