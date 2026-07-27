import { addDays, differenceInCalendarDays } from "date-fns";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { ExpiringDocumentItem } from "@/modules/document/domain/types";

export class DocumentExpiryService extends BaseRepository {
  async findExpiring(withinDays = 30): Promise<ExpiringDocumentItem[]> {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const until = addDays(now, withinDays);

    const rows = await prisma.employeeDocument.findMany({
      where: {
        companyId,
        deletedAt: null,
        expiryDate: { gte: now, lte: until },
        verificationStatus: { not: "archived" },
      },
      include: {
        employee: { select: { firstName: true, middleName: true, lastName: true } },
      },
      orderBy: { expiryDate: "asc" },
      take: 100,
    });

    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: [r.employee.firstName, r.employee.middleName, r.employee.lastName].filter(Boolean).join(" "),
      title: r.title,
      expiryDate: r.expiryDate!.toISOString().slice(0, 10),
      daysUntilExpiry: differenceInCalendarDays(r.expiryDate!, now),
    }));
  }

  async markExpiredDocuments() {
    const companyId = this.requireCompanyId();
    const now = new Date();
    const result = await prisma.employeeDocument.updateMany({
      where: {
        companyId,
        deletedAt: null,
        expiryDate: { lt: now },
        verificationStatus: { notIn: ["expired", "archived"] },
      },
      data: { verificationStatus: "expired", verified: false },
    });
    return result.count;
  }

  /**
   * Notification architecture hook — returns payloads for future notification service.
   */
  async getExpiryReminderPayloads(withinDays = 30) {
    const expiring = await this.findExpiring(withinDays);
    return expiring.map((doc) => ({
      type: "document_expiry_reminder",
      employeeId: doc.employeeId,
      documentId: doc.id,
      title: doc.title,
      expiryDate: doc.expiryDate,
      daysUntilExpiry: doc.daysUntilExpiry,
      message: `${doc.title} expires in ${doc.daysUntilExpiry} day(s)`,
    }));
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createDocumentExpiryService(companyId: string) {
  return new DocumentExpiryService(companyId);
}
