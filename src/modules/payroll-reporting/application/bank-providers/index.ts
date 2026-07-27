import type { BankFileFormat, BankProviderCode } from "@prisma/client";

import type { BankProviderMapping, BankTransferRow } from "@/modules/payroll-reporting/domain/types";

export type BankFileResult = {
  content: string;
  mimeType: string;
  extension: string;
  validationErrors: string[];
};

export interface BankTransferProvider {
  code: BankProviderCode;
  name: string;
  supportedFormats: BankFileFormat[];
  validate(records: BankTransferRow[]): string[];
  generateFile(records: BankTransferRow[], format: BankFileFormat, mapping?: BankProviderMapping): BankFileResult;
}

function defaultMapping(): BankProviderMapping {
  return {
    header: true,
    delimiter: ",",
    columns: [
      { source: "beneficiaryName", target: "Beneficiary Name" },
      { source: "accountNumber", target: "Account Number" },
      { source: "ifscCode", target: "IFSC" },
      { source: "amount", target: "Amount" },
      { source: "paymentMode", target: "Payment Mode" },
      { source: "employeeCode", target: "Employee Code" },
    ],
  };
}

function createGenericProvider(code: BankProviderCode, name: string): BankTransferProvider {
  return {
    code,
    name,
    supportedFormats: ["neft", "rtgs", "csv", "excel", "custom"],
    validate(records) {
      const errors: string[] = [];
      for (const r of records) {
        if (!r.beneficiaryName) errors.push(`${r.employeeCode}: missing beneficiary name`);
        if (!r.accountNumber || r.accountNumber.length < 4) errors.push(`${r.employeeCode}: invalid account number`);
        if (!r.ifscCode || r.ifscCode.length < 4) errors.push(`${r.employeeCode}: invalid IFSC`);
        if (r.amount <= 0) errors.push(`${r.employeeCode}: invalid amount`);
      }
      return errors;
    },
    generateFile(records, format, mapping = defaultMapping()) {
      const errors = this.validate(records);
      if (errors.length) return { content: "", mimeType: "text/plain", extension: "txt", validationErrors: errors };

      const headers = mapping.columns.map((c) => c.target);
      const lines = records.map((r) =>
        mapping.columns
          .map((c) => {
            const val = (r as Record<string, unknown>)[c.source] ?? c.defaultValue ?? "";
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(mapping.delimiter ?? ","),
      );
      const content = mapping.header ? [headers.join(mapping.delimiter ?? ","), ...lines].join("\n") : lines.join("\n");
      const suffix = format === "excel" ? "csv" : format;
      return {
        content,
        mimeType: suffix === "csv" ? "text/csv" : "text/plain",
        extension: suffix === "csv" ? "csv" : "txt",
        validationErrors: [],
      };
    },
  };
}

const PROVIDERS: Record<BankProviderCode, BankTransferProvider> = {
  icici: createGenericProvider("icici", "ICICI Bank"),
  hdfc: createGenericProvider("hdfc", "HDFC Bank"),
  axis: createGenericProvider("axis", "Axis Bank"),
  sbi: createGenericProvider("sbi", "State Bank of India"),
  pnb: createGenericProvider("pnb", "Punjab National Bank"),
  canara: createGenericProvider("canara", "Canara Bank"),
  kotak: createGenericProvider("kotak", "Kotak Mahindra Bank"),
  idfc: createGenericProvider("idfc", "IDFC First Bank"),
  indusind: createGenericProvider("indusind", "IndusInd Bank"),
  generic_csv: createGenericProvider("generic_csv", "Generic CSV"),
  custom: createGenericProvider("custom", "Custom Layout"),
};

export function getBankTransferProvider(code: BankProviderCode): BankTransferProvider {
  return PROVIDERS[code] ?? PROVIDERS.generic_csv;
}

export function listBankProviders() {
  return Object.values(PROVIDERS).map((p) => ({ code: p.code, name: p.name, supportedFormats: p.supportedFormats }));
}
