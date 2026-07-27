export const DOCUMENT_ROUTES = {
  employeeDocuments: (employeeId: string) => `/dashboard/employees/${employeeId}/documents`,
} as const;

export type DocumentListItem = {
  id: string;
  employeeId: string;
  title: string;
  documentType: string;
  documentTypeLabel: string;
  categoryCode: string | null;
  categoryName: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  expiryDate: string | null;
  verificationStatus: string;
  uploadedByName: string | null;
  version: number;
};

export type DocumentDetail = DocumentListItem & {
  description: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  issuingAuthority: string | null;
  fileId: string;
  fileUrl: string;
  remarks: string | null;
};

export type DocumentCategoryItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type DocumentCompletenessReport = {
  employeeId: string;
  totalDocuments: number;
  verifiedCount: number;
  pendingCount: number;
  expiredCount: number;
  missingCategories: string[];
};

export type ExpiringDocumentItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  expiryDate: string;
  daysUntilExpiry: number;
};

export type DocumentDashboardStats = {
  totalDocuments: number;
  pendingVerification: number;
  expiringSoon: number;
  expired: number;
};
