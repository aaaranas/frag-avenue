import "server-only";

/**
 * Small structured logger. In production, emits one JSON line per event
 * (parseable by any log collector). In dev, prints a compact human line.
 * NEVER include secrets, tokens, password hashes, or full email addresses in
 * the `context` object — this is your only line of defence against accidental
 * exfiltration.
 */

type Level = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, string | number | boolean | null | undefined>;

const IS_PROD = process.env.NODE_ENV === "production";

function emit(level: Level, message: string, context?: LogContext): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(context ?? {}),
  };
  if (IS_PROD) {
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
      JSON.stringify(entry),
    );
  } else {
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(
      `[${level}] ${message}`,
      context ?? "",
    );
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
