export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogContext = Record<string, unknown>;

export interface Logger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  fatal(message: string, context?: LogContext): void;
  audit(message: string, context?: LogContext): void;
  security(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

class ConsoleLogger implements Logger {
  constructor(private baseContext: LogContext = {}) {}

  private log(level: LogLevel | "audit" | "security", message: string, context?: LogContext) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.baseContext,
      ...context,
    };
    const fn = level === "error" || level === "fatal" ? console.error : console.info;
    fn(JSON.stringify(entry));
  }

  trace(msg: string, ctx?: LogContext) { this.log("trace", msg, ctx); }
  debug(msg: string, ctx?: LogContext) { this.log("debug", msg, ctx); }
  info(msg: string, ctx?: LogContext) { this.log("info", msg, ctx); }
  warn(msg: string, ctx?: LogContext) { this.log("warn", msg, ctx); }
  error(msg: string, ctx?: LogContext) { this.log("error", msg, ctx); }
  fatal(msg: string, ctx?: LogContext) { this.log("fatal", msg, ctx); }
  audit(msg: string, ctx?: LogContext) { this.log("audit", msg, ctx); }
  security(msg: string, ctx?: LogContext) { this.log("security", msg, ctx); }

  child(context: LogContext): Logger {
    return new ConsoleLogger({ ...this.baseContext, ...context });
  }
}

export const logger = new ConsoleLogger();
