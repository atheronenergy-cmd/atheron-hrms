import type { Prisma } from "@prisma/client";

import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { QrDashboardData, QrScanHistoryItem } from "@/modules/attendance/qr/domain/types";
import type { QrScanHistoryQueryInput } from "@/modules/attendance/qr/validation/schemas";
import { buildPaginatedResult } from "@/shared/pagination";

export class QrReportService extends BaseRepository {
  async getDashboard(): Promise<QrDashboardData> {
    const companyId = this.requireCompanyId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const [activeCodes, expiredCodes, todayScans, failedScans, fraudAttempts, recentScans, activeQrCodes] =
      await Promise.all([
        prisma.qrCode.count({ where: { companyId, status: "active", expiresAt: { gt: now } } }),
        prisma.qrCode.count({
          where: { companyId, OR: [{ status: "expired" }, { status: "used" }, { expiresAt: { lte: now } }] },
        }),
        prisma.qrScanLog.count({ where: { companyId, scannedAt: { gte: todayStart } } }),
        prisma.qrScanLog.count({
          where: { companyId, scannedAt: { gte: todayStart }, result: { not: "success" } },
        }),
        prisma.qrScanLog.count({
          where: {
            companyId,
            scannedAt: { gte: todayStart },
            result: { in: ["replay_detected", "fraud_suspected", "invalid_signature", "clock_tampering"] },
          },
        }),
        this.listHistory({ page: 1, pageSize: 10 }),
        prisma.qrCode.findMany({
          where: { companyId, status: "active", expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    return {
      activeCodes,
      expiredCodes,
      todayScans,
      failedScans,
      fraudAttempts,
      recentScans: recentScans.items,
      activeQrCodes: activeQrCodes.map((q) => ({
        id: q.id,
        name: q.name,
        codeType: q.codeType,
        branchId: q.branchId,
        departmentId: q.departmentId,
        shiftId: q.shiftId,
        status: q.status,
        expiresAt: q.expiresAt.toISOString(),
        expirySeconds: q.expirySeconds,
        createdAt: q.createdAt.toISOString(),
      })),
    };
  }

  async listHistory(query: QrScanHistoryQueryInput) {
    const companyId = this.requireCompanyId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;

    const where: Prisma.QrScanLogWhereInput = {
      companyId,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.result ? { result: query.result as Prisma.EnumQrScanResultFilter["equals"] } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            scannedAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.qrScanLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { scannedAt: "desc" },
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
      prisma.qrScanLog.count({ where }),
    ]);

    const items: QrScanHistoryItem[] = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee
        ? [r.employee.firstName, r.employee.lastName].filter(Boolean).join(" ")
        : "Unknown",
      qrCodeId: r.qrCodeId,
      punchType: r.punchType,
      result: r.result,
      failureReason: r.failureReason,
      scannedAt: r.scannedAt.toISOString(),
      riskScore: r.riskScore,
    }));

    return buildPaginatedResult(items, totalItems, page, pageSize);
  }

  async exportFailedScansCsv(query: QrScanHistoryQueryInput) {
    const result = await this.listHistory({ ...query, page: 1, pageSize: 1000 });
    const header = "Employee,Result,Reason,Scanned At,Risk Score\n";
    const rows = result.items
      .filter((r) => r.result !== "success")
      .map((r) =>
        `"${r.employeeName}","${r.result}","${r.failureReason ?? ""}","${r.scannedAt}",${r.riskScore}`,
      )
      .join("\n");
    return header + rows;
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createQrReportService(companyId: string) {
  return new QrReportService(companyId);
}
