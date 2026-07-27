import type { FileCategory } from "@prisma/client";

import { MAX_UPLOAD_SIZE_MB } from "@/shared/constants/app";

export const FILE_SIZE_LIMITS: Record<FileCategory, number> = {
  employee_photo: 2 * 1024 * 1024,
  document: MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  certificate: 5 * 1024 * 1024,
  payslip: 5 * 1024 * 1024,
  report: 10 * 1024 * 1024,
  company_logo: 2 * 1024 * 1024,
  attendance_capture: 5 * 1024 * 1024,
};

export const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  employee_photo: ["image/jpeg", "image/png", "image/webp"],
  document: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  certificate: ["application/pdf", "image/jpeg", "image/png"],
  payslip: ["application/pdf"],
  report: ["application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  company_logo: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  attendance_capture: ["image/jpeg", "image/png"],
};

export const DEFAULT_DOCUMENT_CATEGORIES = [
  { code: "identity", name: "Identity", sortOrder: 1 },
  { code: "employment", name: "Employment", sortOrder: 2 },
  { code: "education", name: "Education", sortOrder: 3 },
  { code: "experience", name: "Experience", sortOrder: 4 },
  { code: "bank", name: "Bank", sortOrder: 5 },
  { code: "medical", name: "Medical", sortOrder: 6 },
  { code: "legal", name: "Legal", sortOrder: 7 },
  { code: "other", name: "Other", sortOrder: 8 },
] as const;

export const IDENTITY_DOCUMENT_TYPES = [
  "aadhaar_card",
  "pan_card",
  "passport",
  "driving_licence",
  "voter_id",
  "uan_card",
  "esic_card",
] as const;

export const EMPLOYMENT_DOCUMENT_TYPES = [
  "offer_letter",
  "appointment_letter",
  "joining_letter",
  "employment_agreement",
  "promotion_letter",
  "increment_letter",
  "termination_letter",
  "experience_letter",
] as const;

export const EDUCATION_DOCUMENT_TYPES = [
  "degree_certificate",
  "diploma",
  "marksheet",
  "training_certificate",
  "license_certificate",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  aadhaar_card: "Aadhaar Card",
  pan_card: "PAN Card",
  passport: "Passport",
  driving_licence: "Driving Licence",
  voter_id: "Voter ID",
  uan_card: "UAN Card",
  esic_card: "ESIC Card",
  offer_letter: "Offer Letter",
  appointment_letter: "Appointment Letter",
  joining_letter: "Joining Letter",
  employment_agreement: "Employment Agreement",
  promotion_letter: "Promotion Letter",
  increment_letter: "Increment Letter",
  termination_letter: "Termination Letter",
  experience_letter: "Experience Letter",
  degree_certificate: "Degree Certificate",
  diploma: "Diploma",
  marksheet: "Marksheet",
  training_certificate: "Training Certificate",
  license_certificate: "License Certificate",
};

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  pending_verification: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
  archived: "Archived",
};
