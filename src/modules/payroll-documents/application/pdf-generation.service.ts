import { createHash } from "crypto";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import { fileStorageService } from "@/infrastructure/storage/file-storage.service";
import { PayslipPdfDocument } from "@/modules/payroll-documents/pdf/payslip-pdf.template";
import { SalaryCertificatePdfDocument } from "@/modules/payroll-documents/pdf/salary-certificate-pdf.template";
import type { PayslipRenderData, SalaryCertificateRenderData } from "@/modules/payroll-documents/domain/types";

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export class PDFGenerationService {
  async renderPayslipPdf(data: PayslipRenderData): Promise<{ buffer: Buffer; hash: string }> {
    const buffer = Buffer.from(await renderToBuffer(React.createElement(PayslipPdfDocument, { data })));
    return { buffer, hash: hashBuffer(buffer) };
  }

  async renderSalaryCertificatePdf(data: SalaryCertificateRenderData): Promise<{ buffer: Buffer; hash: string }> {
    const buffer = Buffer.from(await renderToBuffer(React.createElement(SalaryCertificatePdfDocument, { data })));
    return { buffer, hash: hashBuffer(buffer) };
  }

  async renderMergedPayslips(items: PayslipRenderData[]): Promise<{ buffer: Buffer; hash: string }> {
    const buffers: Buffer[] = [];
    for (const item of items) {
      const { buffer } = await this.renderPayslipPdf(item);
      buffers.push(buffer);
    }
    const merged = Buffer.concat(buffers);
    return { buffer: merged, hash: hashBuffer(merged) };
  }

  async storePdf(params: {
    companyId: string;
    entityId: string;
    filename: string;
    buffer: Buffer;
    actorUserId?: string;
    category?: "payslip" | "certificate" | "report";
    metadata?: Record<string, unknown>;
  }) {
    return fileStorageService.store({
      companyId: params.companyId,
      category: params.category ?? "payslip",
      entityId: params.entityId,
      originalName: params.filename,
      mimeType: "application/pdf",
      data: params.buffer,
      actorUserId: params.actorUserId,
      metadata: params.metadata,
    });
  }
}

export function createPDFGenerationService() {
  return new PDFGenerationService();
}

export const pdfGenerationService = createPDFGenerationService();
