const LOG_PREFIX = "[integration]";

type LogLevel = "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  if (LEVELS[currentLevel] <= LEVELS.info) {
    console.log(`${LOG_PREFIX} [info] ${message}`, meta ? JSON.stringify(meta) : "");
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  if (LEVELS[currentLevel] <= LEVELS.warn) {
    console.warn(`${LOG_PREFIX} [warn] ${message}`, meta ? JSON.stringify(meta) : "");
  }
}

export function logError(message: string, meta?: Record<string, unknown>) {
  if (LEVELS[currentLevel] <= LEVELS.error) {
    console.error(`${LOG_PREFIX} [error] ${message}`, meta ? JSON.stringify(meta) : "");
  }
}
