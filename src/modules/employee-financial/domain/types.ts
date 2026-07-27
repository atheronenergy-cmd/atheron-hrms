export type BankDetailItem = {
  id: string;
  employeeId: string;
  accountHolderName: string;
  bankName: string;
  branchName: string | null;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  upiId: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  isPrimary: boolean;
  remarks: string | null;
  version: number;
};

export type EmergencyContactItem = {
  id: string;
  employeeId: string;
  name: string;
  relation: string;
  mobile: string;
  email: string | null;
  address: Record<string, unknown>;
  priority: number;
  isPrimary: boolean;
  version: number;
};

export type FamilyMemberItem = {
  id: string;
  employeeId: string;
  name: string;
  relation: string;
  dateOfBirth: string | null;
  gender: string | null;
  occupation: string | null;
  isDependent: boolean;
  dependentSince: string | null;
  version: number;
};

export type NomineeItem = {
  id: string;
  employeeId: string;
  name: string;
  relation: string;
  dateOfBirth: string | null;
  address: Record<string, unknown>;
  mobile: string | null;
  percentage: number;
  nomineeType: string;
  version: number;
};

export type StatutoryDetailItem = {
  id: string;
  employeeId: string;
  pfNumber: string | null;
  uanNumber: string | null;
  esiNumber: string | null;
  esiEligible: boolean;
  pfJoiningDate: string | null;
  pfContributionType: string | null;
  professionalTaxApplicable: boolean;
  lwfApplicable: boolean;
  version: number;
};

export type TaxProfileItem = {
  id: string;
  employeeId: string;
  panNumber: string | null;
  taxRegime: string | null;
  financialYear: string | null;
  taxDeclaration: Record<string, unknown>;
  investmentDeclaration: Record<string, unknown>;
  previousEmployer: Record<string, unknown>;
  version: number;
};

export type InsuranceItem = {
  id: string;
  employeeId: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  nomineeName: string | null;
  policyStatus: string;
  version: number;
};

export type EmployeeFinancialSummary = {
  bankDetails: BankDetailItem[];
  emergencyContacts: EmergencyContactItem[];
  familyMembers: FamilyMemberItem[];
  nominees: NomineeItem[];
  nomineeTotalPercentage: number;
  statutory: StatutoryDetailItem | null;
  tax: TaxProfileItem | null;
  insurance: InsuranceItem[];
};

export const FINANCIAL_SECTIONS = [
  { key: "bank", label: "Bank Details" },
  { key: "emergency", label: "Emergency Contacts" },
  { key: "family", label: "Family" },
  { key: "nominee", label: "Nominee" },
  { key: "statutory", label: "Statutory" },
  { key: "tax", label: "Tax" },
  { key: "insurance", label: "Insurance" },
] as const;
