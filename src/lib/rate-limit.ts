const attempts = new Map<string, { count: number; firstAttempt: number }>();

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return false;
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return false;
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `ratelimit:${ip}`;
}
