import { auditService } from "@/modules/security/application/audit.service";
import type { AuditLogger, CreateAuditLogInput } from "@/shared/audit/audit-logger";

class PrismaAuditLogger implements AuditLogger {
  async log(entry: CreateAuditLogInput): Promise<void> {
    await auditService.persist(entry);
  }
}

export const prismaAuditLogger = new PrismaAuditLogger();
