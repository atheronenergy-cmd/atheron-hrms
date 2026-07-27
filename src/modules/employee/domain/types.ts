export const EMPLOYEE_ROUTES = {
  list: "/dashboard/employees",
  new: "/dashboard/employees/new",
  detail: (id: string) => `/dashboard/employees/${id}`,
  edit: (id: string) => `/dashboard/employees/${id}/edit`,
} as const;

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  probation: "Probation",
  on_notice: "On Notice",
  on_leave: "On Leave",
  resigned: "Resigned",
  terminated: "Terminated",
  separated: "Separated",
  suspended: "Suspended",
  retired: "Retired",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  contract: "Contract",
  intern: "Intern",
  consultant: "Consultant",
  daily: "Daily Wage",
  hourly: "Hourly",
  trainee: "Trainee",
};

export const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export const TIMELINE_EVENT_LABELS: Record<string, string> = {
  employee_created: "Employee Created",
  employee_updated: "Profile Updated",
  department_changed: "Department Changed",
  designation_changed: "Designation Changed",
  branch_transfer: "Branch Transfer",
  manager_changed: "Reporting Manager Changed",
  status_changed: "Status Changed",
  promotion: "Promotion",
  salary_updated: "Salary Updated",
  document_uploaded: "Document Uploaded",
  employee_deactivated: "Deactivated",
  employee_reactivated: "Reactivated",
  employee_deleted: "Deleted",
  employee_restored: "Restored",
  employee_joined: "Employee Joined",
  document_verified: "Document Verified",
  probation_started: "Probation Started",
  probation_extended: "Probation Extended",
  confirmed: "Confirmed",
  transferred: "Transferred",
  promoted: "Promoted",
  warning_issued: "Warning Issued",
  suspended: "Suspended",
  resignation_submitted: "Resignation Submitted",
  exit_clearance_started: "Exit Clearance Started",
  terminated: "Terminated",
  exited: "Exited",
  alumni_created: "Moved to Alumni",
};

export type EmployeeDashboardStats = {
  totalEmployees: number;
  activeCount: number;
  inactiveCount: number;
  probationCount: number;
  newJoinersCount: number;
  upcomingBirthdays: EmployeeUpcomingItem[];
  upcomingAnniversaries: EmployeeUpcomingItem[];
};

export type EmployeeUpcomingItem = {
  id: string;
  employeeCode: string;
  fullName: string;
  date: string;
  label: string;
};

export type EmployeeListItem = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  branchName: string;
  departmentName: string;
  designationName: string;
  employmentStatus: string;
  employmentType: string;
  dateOfJoining: string;
  status: string;
  version: number;
};

export type EmployeeAddressBlock = {
  line1?: string;
  line2?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  pinCode?: string;
};

export type EmployeeEmergencyContact = {
  name?: string;
  phone?: string;
  relation?: string;
};

export type EmployeeIdentityDocuments = {
  aadhaar?: string | null;
  pan?: string | null;
  passport?: string | null;
  passportExpiry?: string | null;
  drivingLicence?: string | null;
  drivingLicenceExpiry?: string | null;
  voterId?: string | null;
  uan?: string | null;
  esicNumber?: string | null;
};

export type EmployeeProfile = {
  id: string;
  employeeCode: string;
  photoFileId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  preferredName: string | null;
  fullName: string;
  gender: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  fatherName: string | null;
  motherName: string | null;
  spouseName: string | null;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  alternatePhone: string | null;
  emergencyContact: EmployeeEmergencyContact;
  permanentAddress: EmployeeAddressBlock;
  currentAddress: EmployeeAddressBlock;
  identityDocuments: EmployeeIdentityDocuments;
  dateOfJoining: string;
  confirmationDate: string | null;
  dateOfSeparation: string | null;
  employmentType: string;
  employmentStatus: string;
  probationStatus: string | null;
  noticePeriodDays: number | null;
  workLocation: string | null;
  branchId: string;
  branchName: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  designationLevel: number;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  status: string;
  remarks: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeTimelineItem = {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; message: string }>;
};

export type ExportFormat = "csv" | "excel" | "pdf";
