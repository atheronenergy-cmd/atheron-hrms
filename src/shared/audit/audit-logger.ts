export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "export"
  | "view";

export type AuditLogEntry = {
  id: string;
  companyId?: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

export type CreateAuditLogInput = Omit<AuditLogEntry, "id" | "createdAt">;

export interface AuditLogger {
  log(entry: CreateAuditLogInput): Promise<void>;
}

class ConsoleAuditLogger implements AuditLogger {
  async log(entry: CreateAuditLogInput): Promise<void> {
    console.info("[AUDIT]", JSON.stringify({ ...entry, timestamp: new Date().toISOString() }));
  }
}

class CompositeAuditLogger implements AuditLogger {
  constructor(private readonly loggers: AuditLogger[]) {}

  async log(entry: CreateAuditLogInput): Promise<void> {
    await Promise.allSettled(this.loggers.map((logger) => logger.log(entry)));
  }
}

const consoleLogger = new ConsoleAuditLogger();

let prismaLogger: AuditLogger | null = null;

function getPrismaLogger(): AuditLogger {
  if (!prismaLogger) {
    // Lazy load to avoid circular imports during module init
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prismaAuditLogger } = require("@/infrastructure/security/prisma-audit-logger") as {
      prismaAuditLogger: AuditLogger;
    };
    prismaLogger = prismaAuditLogger;
  }
  return prismaLogger;
}

export const auditLogger: AuditLogger = new CompositeAuditLogger([
  consoleLogger,
  { log: (entry) => getPrismaLogger().log(entry) },
]);
