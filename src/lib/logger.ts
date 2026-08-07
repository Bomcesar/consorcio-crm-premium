export type LogLevel = "info" | "warn" | "error";

function shouldLog(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_APP_LOGS === "true";
}

export function appLog(level: LogLevel, event: string, details?: unknown) {
  if (!shouldLog()) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    details: details ?? null,
  };

  if (level === "error") {
    console.error("[crm]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[crm]", payload);
    return;
  }

  console.log("[crm]", payload);
}
