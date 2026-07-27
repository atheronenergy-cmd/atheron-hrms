export const QR_ATTENDANCE_ROUTES = {
  dashboard: "/dashboard/attendance/qr",
} as const;

export const QR_CODE_TYPE_LABELS: Record<string, string> = {
  office: "Office QR",
  branch: "Branch QR",
  department: "Department QR",
  shift: "Shift QR",
  meeting: "Meeting QR",
  training: "Training QR",
  visitor: "Visitor QR",
};

export const QR_SCAN_RESULT_LABELS: Record<string, string> = {
  success: "Success",
  expired: "Expired",
  invalid_signature: "Invalid Signature",
  replay_detected: "Replay Detected",
  wrong_branch: "Wrong Branch",
  wrong_shift: "Wrong Shift",
  wrong_department: "Wrong Department",
  fraud_suspected: "Fraud Suspected",
  policy_violation: "Policy Violation",
  revoked: "Revoked",
  invalid_payload: "Invalid Payload",
  clock_tampering: "Clock Tampering",
};

export const QR_EXPIRY_OPTIONS = [30, 60, 300, 600] as const;

export type QrPayload = {
  v: number;
  cid: string;
  qid: string;
  typ: string;
  bid?: string;
  did?: string;
  sid?: string;
  iat: number;
  exp: number;
  nonce: string;
};

export type QrCodeListItem = {
  id: string;
  name: string;
  codeType: string;
  branchId: string | null;
  departmentId: string | null;
  shiftId: string | null;
  status: string;
  expiresAt: string;
  expirySeconds: number;
  createdAt: string;
};

export type QrScanHistoryItem = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  qrCodeId: string | null;
  punchType: string | null;
  result: string;
  failureReason: string | null;
  scannedAt: string;
  riskScore: number;
};

export type QrDashboardData = {
  activeCodes: number;
  expiredCodes: number;
  todayScans: number;
  failedScans: number;
  fraudAttempts: number;
  recentScans: QrScanHistoryItem[];
  activeQrCodes: QrCodeListItem[];
};

export type QrValidationStep = {
  step: string;
  passed: boolean;
  details?: string;
};

export type QrScanResultData = {
  success: boolean;
  result: string;
  message: string;
  steps: QrValidationStep[];
  attendanceLogId?: string;
  punchType?: string;
};

export const DEFAULT_QR_POLICY = {
  validationMode: "qr_only" as const,
  defaultExpirySeconds: 60,
  requireBranchMatch: true,
  requireShiftMatch: false,
  requireDepartmentMatch: false,
  singleUse: true,
};
