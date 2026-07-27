import type { AccountingProviderCode } from "@prisma/client";

import { DEFAULT_JOURNAL_ACCOUNTS, type AccountingProviderMapping } from "@/modules/payroll-reporting/domain/types";

export type AccountingExportResult = {
  content: string;
  mimeType: string;
  extension: string;
  summary: Record<string, number>;
};

export type JournalLineInput = {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  costCenterCode?: string;
};

export interface AccountingExportProvider {
  code: AccountingProviderCode;
  name: string;
  generateExport(lines: JournalLineInput[], mapping?: AccountingProviderMapping): AccountingExportResult;
}

function createCsvProvider(code: AccountingProviderCode, name: string, delimiter = ","): AccountingExportProvider {
  return {
    code,
    name,
    generateExport(lines, mapping) {
      const accounts = { ...DEFAULT_JOURNAL_ACCOUNTS, ...(mapping?.accounts ?? {}) };
      const headers = ["Account Code", "Account Name", "Debit", "Credit", "Cost Center"];
      const rows = lines.map((l) => [l.accountCode, l.accountName, l.debitAmount, l.creditAmount, l.costCenterCode ?? ""].join(delimiter));
      const content = [headers.join(delimiter), ...rows].join("\n");
      const summary = lines.reduce(
        (s, l) => ({ debit: s.debit + l.debitAmount, credit: s.credit + l.creditAmount }),
        { debit: 0, credit: 0 },
      );
      return { content, mimeType: "text/csv", extension: "csv", summary };
    },
  };
}

const PROVIDERS: Record<AccountingProviderCode, AccountingExportProvider> = {
  tally_prime: createCsvProvider("tally_prime", "Tally Prime"),
  zoho_books: createCsvProvider("zoho_books", "Zoho Books"),
  busy: createCsvProvider("busy", "Busy Accounting"),
  erpnext: createCsvProvider("erpnext", "ERPNext"),
  quickbooks: createCsvProvider("quickbooks", "QuickBooks"),
  custom_csv: createCsvProvider("custom_csv", "Custom CSV"),
  journal_entry: createCsvProvider("journal_entry", "Journal Entry"),
  general_ledger: createCsvProvider("general_ledger", "General Ledger"),
};

export function getAccountingProvider(code: AccountingProviderCode): AccountingExportProvider {
  return PROVIDERS[code] ?? PROVIDERS.custom_csv;
}

export function listAccountingProviders() {
  return Object.values(PROVIDERS).map((p) => ({ code: p.code, name: p.name }));
}
