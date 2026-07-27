export const DEFAULT_JOINING_CHECKLIST = [
  { code: "offer_accepted", label: "Offer accepted", completed: false },
  { code: "documents_submitted", label: "Documents submitted", completed: false },
  { code: "bank_details", label: "Bank details completed", completed: false },
  { code: "id_verification", label: "ID verification completed", completed: false },
  { code: "assets_assigned", label: "Company assets assigned", completed: false },
  { code: "training_completed", label: "Training completed", completed: false },
] as const;

export const DEFAULT_EXIT_CLEARANCE_ITEMS = [
  { department: "hr", item: "Exit interview completed" },
  { department: "hr", item: "Documents completed" },
  { department: "accounts", item: "Pending dues cleared" },
  { department: "it", item: "System access revoked" },
  { department: "admin", item: "Company assets returned" },
  { department: "store", item: "Store items returned" },
] as const;

export const RESIGNATION_REASON_LABELS: Record<string, string> = {
  career_growth: "Career Growth",
  personal: "Personal Reason",
  relocation: "Relocation",
  higher_studies: "Higher Studies",
  health: "Health",
  other: "Other",
};

export const PROBATION_STATUS_LABELS: Record<string, string> = {
  running: "Running",
  completed: "Completed",
  extended: "Extended",
  failed: "Failed",
};

export const LIFECYCLE_EVENT_LABELS: Record<string, string> = {
  employee_joined: "Employee Joined",
  document_verified: "Document Verified",
  probation_started: "Probation Started",
  probation_extended: "Probation Extended",
  confirmed: "Confirmed",
  transferred: "Transferred",
  promoted: "Promoted",
  salary_updated: "Salary Updated",
  warning_issued: "Warning Issued",
  suspended: "Suspended",
  resignation_submitted: "Resignation Submitted",
  exit_clearance_started: "Exit Clearance Started",
  terminated: "Terminated",
  exited: "Exited",
  alumni_created: "Moved to Alumni",
};

export type JoiningChecklistItem = {
  code: string;
  label: string;
  completed: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
};

export type JoiningRecordItem = {
  id: string;
  employeeId: string;
  joiningDate: string;
  checklist: JoiningChecklistItem[];
  status: string;
  hrApproved: boolean;
  managerApproved: boolean;
  version: number;
};

export type ProbationRecordItem = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: string;
  reviewNotes: string | null;
  extendedTo: string | null;
  recommendation: string | null;
  version: number;
};

export type ConfirmationRecordItem = {
  id: string;
  employeeId: string;
  confirmationDate: string;
  rating: number | null;
  comments: string | null;
  version: number;
};

export type TransferRecordItem = {
  id: string;
  employeeId: string;
  transferType: string;
  previousValue: string;
  newValue: string;
  effectiveDate: string;
  reason: string | null;
  version: number;
};

export type PromotionRecordItem = {
  id: string;
  employeeId: string;
  previousDesignation: string;
  newDesignation: string;
  promotionDate: string;
  reason: string | null;
  comments: string | null;
  version: number;
};

export type SalaryRevisionItem = {
  id: string;
  employeeId: string;
  previousSalary: number;
  newSalary: number;
  effectiveDate: string;
  reason: string | null;
  revisionType: string | null;
  version: number;
};

export type WarningRecordItem = {
  id: string;
  employeeId: string;
  warningType: string;
  reason: string;
  issuedDate: string;
  status: string;
  version: number;
};

export type SuspensionRecordItem = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string | null;
  reason: string;
  status: string;
  version: number;
};

export type ResignationRecordItem = {
  id: string;
  employeeId: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
  noticePeriodDays: number | null;
  approvalStatus: string;
  version: number;
};

export type ExitClearanceItem = {
  id: string;
  department: string;
  checklistItem: string;
  status: string;
};

export type ExitClearanceRecord = {
  id: string;
  employeeId: string;
  status: string;
  items: ExitClearanceItem[];
  version: number;
};

export type TerminationRecordItem = {
  id: string;
  employeeId: string;
  terminationDate: string;
  reason: string;
  comments: string | null;
  version: number;
};

export type AlumniRecordItem = {
  id: string;
  employeeId: string;
  joiningDate: string;
  exitDate: string;
  lastDesignation: string;
  lastDepartment: string;
};

export type JourneyEventItem = {
  id: string;
  stage: string;
  eventType: string;
  title: string;
  description: string | null;
  eventDate: string;
};

export type WorkflowStepItem = {
  id: string;
  stepOrder: number;
  approverRole: string;
  status: string;
  comments: string | null;
  actedAt: string | null;
};

export type WorkflowRequestItem = {
  id: string;
  entityType: string;
  title: string;
  status: string;
  currentStep: number;
  steps: WorkflowStepItem[];
};

export type LifecycleNotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  dueDate: string | null;
};

import type { FinalSettlementRecoverySummary } from "@/modules/loan-recovery/domain/types";

export type EmployeeLifecycleSummary = {
  joining: JoiningRecordItem | null;
  probations: ProbationRecordItem[];
  confirmations: ConfirmationRecordItem[];
  transfers: TransferRecordItem[];
  promotions: PromotionRecordItem[];
  salaryRevisions: SalaryRevisionItem[];
  warnings: WarningRecordItem[];
  suspensions: SuspensionRecordItem[];
  resignations: ResignationRecordItem[];
  exitClearance: ExitClearanceRecord | null;
  settlementRecovery: FinalSettlementRecoverySummary | null;
  terminations: TerminationRecordItem[];
  alumni: AlumniRecordItem | null;
  journeyEvents: JourneyEventItem[];
  pendingWorkflows: WorkflowRequestItem[];
  notifications: LifecycleNotificationItem[];
};

export const LIFECYCLE_SECTIONS = [
  { key: "career", label: "Career Timeline" },
  { key: "joining", label: "Joining" },
  { key: "probation", label: "Probation" },
  { key: "transfers", label: "Transfers" },
  { key: "promotions", label: "Promotions" },
  { key: "salary", label: "Salary History" },
  { key: "warnings", label: "Warnings" },
  { key: "resignation", label: "Resignation & Exit" },
] as const;
