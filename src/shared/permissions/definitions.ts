/**
 * Canonical permission catalog for Atheron HRMS.
 * Format: module.resource.action
 * "read" maps to view access in UI terminology.
 */

export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "export",
  "import",
  "manage",
  "configure",
  "assign",
  "verify",
  "download",
  "override",
  "revoke",
  "close",
  "view",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionDefinition = {
  module: string;
  resource: string;
  action: PermissionAction;
  key: string;
  description: string;
};

function perm(
  module: string,
  resource: string,
  action: PermissionAction,
  description: string,
): PermissionDefinition {
  return {
    module,
    resource,
    action,
    key: `${module}.${resource}.${action}`,
    description,
  };
}

function crud(
  module: string,
  resource: string,
  label: string,
  extras: PermissionAction[] = [],
): PermissionDefinition[] {
  const base: PermissionAction[] = ["read", "create", "update", "delete"];
  return [...base, ...extras].map((action) =>
    perm(module, resource, action, `${action.charAt(0).toUpperCase()}${action.slice(1)} ${label}`),
  );
}

/** All system permissions — single source of truth for seeds and runtime. */
export const SYSTEM_PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  perm("dashboard", "view", "read", "View dashboard"),

  ...crud("company", "profile", "company profile", ["manage", "configure"]),
  ...crud("branch", "profile", "branches", ["manage"]),
  ...crud("department", "profile", "departments", ["manage"]),
  ...crud("designation", "profile", "designations", ["manage"]),

  ...crud("employee", "profile", "employees"),
  perm("employee", "profile", "export", "Export employees"),
  perm("employee", "profile", "import", "Import employees"),
  perm("employee", "salary", "read", "View employee salary"),
  perm("employee", "salary", "update", "Update employee salary"),
  perm("employee", "salary", "approve", "Approve salary changes"),

  perm("employee", "lifecycle", "read", "View employee lifecycle"),
  perm("employee", "lifecycle", "manage", "Manage employee lifecycle"),
  perm("employee", "probation", "manage", "Manage employee probation"),
  perm("employee", "confirmation", "manage", "Manage employee confirmation"),
  perm("employee", "transfer", "manage", "Manage employee transfers"),
  perm("employee", "promotion", "manage", "Manage employee promotions"),
  perm("employee", "resignation", "manage", "Manage employee resignations"),
  perm("employee", "termination", "manage", "Manage employee terminations"),

  perm("employee", "bank", "read", "View employee bank details"),
  perm("employee", "bank", "manage", "Manage employee bank details"),

  perm("employee", "family", "read", "View employee family information"),
  perm("employee", "family", "manage", "Manage employee family information"),

  perm("employee", "tax", "read", "View employee tax information"),
  perm("employee", "tax", "manage", "Manage employee tax information"),

  perm("employee", "statutory", "read", "View employee statutory information"),
  perm("employee", "statutory", "manage", "Manage employee statutory information"),

  perm("employee", "insurance", "read", "View employee insurance information"),
  perm("employee", "insurance", "manage", "Manage employee insurance information"),

  ...crud("document", "file", "employee documents", ["export"]),
  perm("document", "file", "verify", "Verify employee documents"),
  perm("document", "file", "download", "Download employee documents"),

  perm("attendance", "record", "read", "View attendance"),
  perm("attendance", "record", "create", "Mark attendance"),
  perm("attendance", "record", "update", "Update attendance"),
  perm("attendance", "record", "delete", "Delete attendance"),
  perm("attendance", "record", "approve", "Approve attendance"),
  perm("attendance", "record", "export", "Export attendance"),
  perm("attendance", "rule", "manage", "Manage attendance rules"),

  perm("gps_attendance", "record", "read", "View GPS attendance"),
  perm("gps_attendance", "record", "create", "Record GPS attendance"),
  perm("gps_attendance", "record", "approve", "Approve GPS attendance"),
  perm("gps_attendance", "record", "configure", "Configure GPS attendance"),
  perm("gps_attendance", "record", "override", "Override GPS attendance validation"),
  perm("location", "history", "read", "View employee location history"),

  perm("qr", "code", "read", "View QR codes"),
  perm("qr", "code", "create", "Generate QR codes"),
  perm("qr", "code", "revoke", "Revoke QR codes"),
  perm("qr", "scan", "create", "Scan QR for attendance"),
  perm("qr", "policy", "manage", "Manage QR policies"),
  perm("qr", "report", "read", "View QR attendance reports"),

  perm("leave", "request", "read", "View leave requests"),
  perm("leave", "request", "create", "Apply for leave"),
  perm("leave", "request", "approve", "Approve leave"),
  perm("leave", "request", "reject", "Reject leave"),
  perm("leave", "view", "read", "View leave module"),
  perm("leave", "apply", "create", "Apply for leave"),
  perm("leave", "approve", "approve", "Approve leave requests"),
  perm("leave", "reject", "reject", "Reject leave requests"),
  perm("leave", "cancel", "delete", "Cancel leave requests"),
  perm("leave", "module", "manage", "Manage leave module"),
  perm("leave", "policy", "manage", "Manage leave policies"),
  perm("leave", "balance", "manage", "Manage leave balances"),

  ...crud("holiday", "calendar", "holiday calendar", ["manage"]),
  ...crud("shift", "schedule", "shift schedules", ["manage", "configure"]),

  perm("payroll", "payrun", "read", "View payroll runs"),
  perm("payroll", "payrun", "create", "Process payroll"),
  perm("payroll", "payrun", "approve", "Approve payroll"),
  perm("payroll", "payrun", "export", "Export payroll"),
  perm("payroll", "payslip", "read", "View payslips"),
  perm("payroll", "payslip", "export", "Export payslips"),
  perm("payslip", "view", "read", "View payslip documents"),
  perm("payslip", "generate", "create", "Generate payslips"),
  perm("payslip", "download", "read", "Download payslip PDFs"),
  perm("payslip", "email", "manage", "Email payslip documents"),
  perm("salary_certificate", "generate", "create", "Generate salary certificates"),
  perm("payroll_export", "generate", "create", "Generate payroll Excel exports"),
  perm("payroll", "view", "read", "View payroll runs and calculations"),
  perm("payroll", "generate", "create", "Generate payroll batches"),
  perm("payroll", "calculate", "create", "Calculate and recalculate payroll"),
  perm("payroll", "approve", "approve", "Approve payroll runs"),
  perm("payroll", "lock", "manage", "Lock payroll runs"),
  perm("payroll", "unlock", "override", "Unlock payroll runs"),
  perm("payroll", "rollback", "manage", "Rollback payroll versions"),
  perm("payroll", "retro", "manage", "Manage retro payroll adjustments"),
  perm("payroll", "arrear", "manage", "Manage payroll arrears"),
  perm("payroll", "year", "close", "Close and archive payroll years"),
  perm("payroll", "backup", "manage", "Backup and restore payroll data"),
  perm("payroll", "delete", "delete", "Delete or cancel payroll runs"),

  perm("statutory", "module", "read", "View statutory dashboard and reports"),
  perm("statutory", "module", "manage", "Manage statutory configuration"),
  perm("statutory", "pf", "manage", "Manage PF configuration"),
  perm("statutory", "esi", "manage", "Manage ESI configuration"),
  perm("statutory", "pt", "manage", "Manage professional tax configuration"),
  perm("statutory", "tds", "manage", "Manage income tax and TDS configuration"),

  perm("overtime", "module", "read", "View overtime dashboard and records"),
  perm("overtime", "module", "manage", "Manage overtime rules and records"),
  perm("overtime", "request", "approve", "Approve overtime requests"),
  perm("bonus", "module", "manage", "Manage bonus rules and assignments"),
  perm("incentive", "module", "manage", "Manage incentive rules and assignments"),
  perm("commission", "module", "manage", "Manage commission rules and assignments"),
  perm("allowance", "module", "manage", "Manage allowance rules and assignments"),

  perm("salary", "view", "read", "View salary structures and assignments"),
  perm("salary", "create", "create", "Create salary structures and components"),
  perm("salary", "update", "update", "Update salary structures and components"),
  perm("salary", "delete", "delete", "Delete salary structures and components"),
  perm("salary", "assign", "assign", "Assign salary to employees"),
  perm("salary", "approve", "approve", "Approve salary assignments and revisions"),

  ...crud("salary", "structure", "salary structures", ["approve"]),
  perm("loan", "request", "read", "View loan requests"),
  perm("loan", "request", "create", "Create loan requests"),
  perm("loan", "request", "approve", "Approve loans"),
  perm("loan", "request", "reject", "Reject loans"),
  perm("loan", "request", "manage", "Manage loans"),
  perm("loan", "view", "read", "View employee loans"),
  perm("loan", "create", "create", "Create employee loans"),
  perm("loan", "update", "update", "Update employee loans"),
  perm("loan", "approve", "approve", "Approve employee loans"),
  perm("loan", "reject", "reject", "Reject employee loans"),
  perm("loan", "recover", "manage", "Process loan recoveries"),
  perm("loan", "foreclose", "manage", "Foreclose employee loans"),

  perm("advance", "request", "read", "View advance requests"),
  perm("advance", "request", "create", "Create advance requests"),
  perm("advance", "request", "approve", "Approve advances"),
  perm("advance", "request", "reject", "Reject advances"),
  perm("advance", "manage", "manage", "Manage salary advances"),

  ...crud("asset", "inventory", "assets", ["manage"]),
  ...crud("recruitment", "job", "recruitment jobs", ["approve", "manage"]),
  ...crud("performance", "review", "performance reviews", ["approve", "manage"]),
  ...crud("training", "program", "training programs", ["manage"]),

  perm("expense", "claim", "read", "View expense claims"),
  perm("expense", "claim", "create", "Submit expense claims"),
  perm("expense", "claim", "approve", "Approve expense claims"),
  perm("expense", "claim", "reject", "Reject expense claims"),
  perm("expense", "claim", "export", "Export expense claims"),

  perm("report", "general", "read", "View reports"),
  perm("report", "general", "export", "Export reports"),
  perm("report", "payroll", "read", "View payroll reports"),
  perm("report", "payroll", "export", "Export payroll reports"),
  perm("payroll", "report", "view", "View payroll reporting module"),
  perm("payroll", "report", "export", "Export payroll reports and registers"),
  perm("bank_transfer", "generate", "create", "Generate bank transfer files"),
  perm("bank_transfer", "approve", "approve", "Approve bank transfer batches"),
  perm("accounting", "export", "create", "Generate accounting exports"),
  perm("analytics", "view", "read", "View payroll analytics"),
  perm("cost_center", "manage", "manage", "Manage cost centers"),
  perm("report", "attendance", "read", "View attendance reports"),
  perm("report", "attendance", "export", "Export attendance reports"),

  perm("settings", "system", "read", "View settings"),
  perm("settings", "system", "manage", "Manage settings"),
  perm("settings", "system", "configure", "Configure system settings"),
  perm("settings", "permission", "manage", "Manage permissions"),

  perm("user", "account", "read", "View user accounts"),
  perm("user", "account", "create", "Create user accounts"),
  perm("user", "account", "update", "Update user accounts"),
  perm("user", "account", "delete", "Delete user accounts"),
  perm("user", "account", "manage", "Manage user accounts"),
  perm("user", "role", "assign", "Assign roles to users"),

  perm("role", "profile", "read", "View roles"),
  perm("role", "profile", "create", "Create roles"),
  perm("role", "profile", "update", "Update roles"),
  perm("role", "profile", "delete", "Delete roles"),
  perm("role", "profile", "manage", "Manage roles"),
  perm("role", "profile", "configure", "Configure role permissions"),

  perm("audit", "log", "read", "View audit logs"),
  perm("audit", "log", "export", "Export audit logs"),

  perm("hr", "policy", "read", "View HR policies"),
  perm("hr", "policy", "manage", "Manage HR policies"),

  perm("settings", "security", "read", "View security dashboard"),
  perm("settings", "security", "manage", "Manage security settings"),
];

export const ALL_PERMISSION_KEYS = SYSTEM_PERMISSION_DEFINITIONS.map((p) => p.key);

export type SystemPermissionKey = (typeof ALL_PERMISSION_KEYS)[number];

/** Nested constants for type-safe references in code. */
export const PERMISSIONS = {
  DASHBOARD: { VIEW: "dashboard.view.read" },
  COMPANY: {
    PROFILE: {
      READ: "company.profile.read",
      CREATE: "company.profile.create",
      UPDATE: "company.profile.update",
      DELETE: "company.profile.delete",
      MANAGE: "company.profile.manage",
      CONFIGURE: "company.profile.configure",
    },
  },
  BRANCH: {
    PROFILE: {
      READ: "branch.profile.read",
      CREATE: "branch.profile.create",
      UPDATE: "branch.profile.update",
      DELETE: "branch.profile.delete",
      MANAGE: "branch.profile.manage",
    },
  },
  DEPARTMENT: {
    PROFILE: {
      READ: "department.profile.read",
      CREATE: "department.profile.create",
      UPDATE: "department.profile.update",
      DELETE: "department.profile.delete",
      MANAGE: "department.profile.manage",
    },
  },
  DESIGNATION: {
    PROFILE: {
      READ: "designation.profile.read",
      CREATE: "designation.profile.create",
      UPDATE: "designation.profile.update",
      DELETE: "designation.profile.delete",
      MANAGE: "designation.profile.manage",
    },
  },
  HOLIDAY: {
    CALENDAR: {
      READ: "holiday.calendar.read",
      CREATE: "holiday.calendar.create",
      UPDATE: "holiday.calendar.update",
      DELETE: "holiday.calendar.delete",
      MANAGE: "holiday.calendar.manage",
    },
  },
  SHIFT: {
    SCHEDULE: {
      READ: "shift.schedule.read",
      CREATE: "shift.schedule.create",
      UPDATE: "shift.schedule.update",
      DELETE: "shift.schedule.delete",
      MANAGE: "shift.schedule.manage",
      CONFIGURE: "shift.schedule.configure",
    },
  },
  HR: {
    POLICY: { READ: "hr.policy.read", MANAGE: "hr.policy.manage" },
  },
  EMPLOYEE: {
    PROFILE: {
      READ: "employee.profile.read",
      CREATE: "employee.profile.create",
      UPDATE: "employee.profile.update",
      DELETE: "employee.profile.delete",
      EXPORT: "employee.profile.export",
      IMPORT: "employee.profile.import",
    },
    SALARY: {
      READ: "employee.salary.read",
      UPDATE: "employee.salary.update",
      APPROVE: "employee.salary.approve",
    },
    BANK: {
      READ: "employee.bank.read",
      MANAGE: "employee.bank.manage",
    },
    FAMILY: {
      READ: "employee.family.read",
      MANAGE: "employee.family.manage",
    },
    TAX: {
      READ: "employee.tax.read",
      MANAGE: "employee.tax.manage",
    },
    STATUTORY: {
      READ: "employee.statutory.read",
      MANAGE: "employee.statutory.manage",
    },
    INSURANCE: {
      READ: "employee.insurance.read",
      MANAGE: "employee.insurance.manage",
    },
    LIFECYCLE: {
      READ: "employee.lifecycle.read",
      MANAGE: "employee.lifecycle.manage",
    },
    PROBATION: { MANAGE: "employee.probation.manage" },
    CONFIRMATION: { MANAGE: "employee.confirmation.manage" },
    TRANSFER: { MANAGE: "employee.transfer.manage" },
    PROMOTION: { MANAGE: "employee.promotion.manage" },
    RESIGNATION: { MANAGE: "employee.resignation.manage" },
    TERMINATION: { MANAGE: "employee.termination.manage" },
  },
  ATTENDANCE: {
    RECORD: {
      READ: "attendance.record.read",
      CREATE: "attendance.record.create",
      UPDATE: "attendance.record.update",
      DELETE: "attendance.record.delete",
      APPROVE: "attendance.record.approve",
      EXPORT: "attendance.record.export",
    },
    RULE: { MANAGE: "attendance.rule.manage" },
  },
  GPS_ATTENDANCE: {
    RECORD: {
      READ: "gps_attendance.record.read",
      CREATE: "gps_attendance.record.create",
      APPROVE: "gps_attendance.record.approve",
      CONFIGURE: "gps_attendance.record.configure",
      OVERRIDE: "gps_attendance.record.override",
    },
  },
  LOCATION: {
    HISTORY: { READ: "location.history.read" },
  },
  QR: {
    CODE: {
      READ: "qr.code.read",
      CREATE: "qr.code.create",
      REVOKE: "qr.code.revoke",
    },
    SCAN: { CREATE: "qr.scan.create" },
    POLICY: { MANAGE: "qr.policy.manage" },
    REPORT: { READ: "qr.report.read" },
  },
  LEAVE: {
    VIEW: "leave.view.read",
    APPLY: "leave.apply.create",
    APPROVE: "leave.approve.approve",
    REJECT: "leave.reject.reject",
    CANCEL: "leave.cancel.delete",
    MANAGE: "leave.module.manage",
    POLICY: { MANAGE: "leave.policy.manage" },
    BALANCE: { MANAGE: "leave.balance.manage" },
    REQUEST: {
      READ: "leave.request.read",
      CREATE: "leave.request.create",
      APPROVE: "leave.request.approve",
      REJECT: "leave.request.reject",
    },
  },
  PAYROLL: {
    PAYRUN: {
      READ: "payroll.payrun.read",
      CREATE: "payroll.payrun.create",
      APPROVE: "payroll.payrun.approve",
      EXPORT: "payroll.payrun.export",
    },
    PAYSLIP: {
      READ: "payroll.payslip.read",
      EXPORT: "payroll.payslip.export",
      VIEW: "payslip.view.read",
      GENERATE: "payslip.generate.create",
      DOWNLOAD: "payslip.download.read",
      EMAIL: "payslip.email.manage",
    },
    VIEW: "payroll.view.read",
    GENERATE: "payroll.generate.create",
    CALCULATE: "payroll.calculate.create",
    APPROVE: "payroll.approve.approve",
    LOCK: "payroll.lock.manage",
    UNLOCK: "payroll.unlock.override",
    ROLLBACK: "payroll.rollback.manage",
    RETRO: { MANAGE: "payroll.retro.manage" },
    ARREAR: { MANAGE: "payroll.arrear.manage" },
    YEAR: { CLOSE: "payroll.year.close" },
    BACKUP: { MANAGE: "payroll.backup.manage" },
    DELETE: "payroll.delete.delete",
    SALARY: {
      VIEW: "salary.view.read",
      CREATE: "salary.create.create",
      UPDATE: "salary.update.update",
      DELETE: "salary.delete.delete",
      ASSIGN: "salary.assign.assign",
      APPROVE: "salary.approve.approve",
      STRUCTURE: {
        READ: "salary.structure.read",
        CREATE: "salary.structure.create",
        UPDATE: "salary.structure.update",
        DELETE: "salary.structure.delete",
        APPROVE: "salary.structure.approve",
      },
    },
  },
  STATUTORY: {
    VIEW: "statutory.module.read",
    MANAGE: "statutory.module.manage",
    PF: { MANAGE: "statutory.pf.manage" },
    ESI: { MANAGE: "statutory.esi.manage" },
    PT: { MANAGE: "statutory.pt.manage" },
    TDS: { MANAGE: "statutory.tds.manage" },
  },
  OVERTIME: {
    VIEW: "overtime.module.read",
    MANAGE: "overtime.module.manage",
    APPROVE: "overtime.request.approve",
  },
  BONUS: { MANAGE: "bonus.module.manage" },
  INCENTIVE: { MANAGE: "incentive.module.manage" },
  COMMISSION: { MANAGE: "commission.module.manage" },
  ALLOWANCE: { MANAGE: "allowance.module.manage" },
  PAYSLIP: {
    VIEW: "payslip.view.read",
    GENERATE: "payslip.generate.create",
    DOWNLOAD: "payslip.download.read",
    EMAIL: "payslip.email.manage",
  },
  SALARY_CERTIFICATE: { GENERATE: "salary_certificate.generate.create" },
  PAYROLL_EXPORT: { GENERATE: "payroll_export.generate.create" },
  PAYROLL_REPORTING: {
    VIEW: "payroll.report.view",
    EXPORT: "payroll.report.export",
  },
  BANK_TRANSFER: {
    GENERATE: "bank_transfer.generate.create",
    APPROVE: "bank_transfer.approve.approve",
  },
  ACCOUNTING: { EXPORT: "accounting.export.create" },
  ANALYTICS: { VIEW: "analytics.view.read" },
  COST_CENTER: { MANAGE: "cost_center.manage.manage" },
  LOAN: {
    VIEW: "loan.view.read",
    CREATE: "loan.create.create",
    UPDATE: "loan.update.update",
    APPROVE: "loan.approve.approve",
    REJECT: "loan.reject.reject",
    RECOVER: "loan.recover.manage",
    FORECLOSE: "loan.foreclose.manage",
    REQUEST: {
      READ: "loan.request.read",
      CREATE: "loan.request.create",
      APPROVE: "loan.request.approve",
      REJECT: "loan.request.reject",
      MANAGE: "loan.request.manage",
    },
  },
  ADVANCE: {
    MANAGE: "advance.manage.manage",
    REQUEST: {
      READ: "advance.request.read",
      CREATE: "advance.request.create",
      APPROVE: "advance.request.approve",
      REJECT: "advance.request.reject",
    },
  },
  REPORT: {
    GENERAL: { READ: "report.general.read", EXPORT: "report.general.export" },
    PAYROLL: { READ: "report.payroll.read", EXPORT: "report.payroll.export" },
    ATTENDANCE: { READ: "report.attendance.read", EXPORT: "report.attendance.export" },
  },
  SETTINGS: {
    SYSTEM: {
      READ: "settings.system.read",
      MANAGE: "settings.system.manage",
      CONFIGURE: "settings.system.configure",
    },
    PERMISSION: { MANAGE: "settings.permission.manage" },
    SECURITY: { READ: "settings.security.read", MANAGE: "settings.security.manage" },
  },
  USER: {
    ACCOUNT: {
      READ: "user.account.read",
      CREATE: "user.account.create",
      UPDATE: "user.account.update",
      DELETE: "user.account.delete",
      MANAGE: "user.account.manage",
    },
    ROLE: { ASSIGN: "user.role.assign" },
  },
  ROLE: {
    PROFILE: {
      READ: "role.profile.read",
      CREATE: "role.profile.create",
      UPDATE: "role.profile.update",
      DELETE: "role.profile.delete",
      MANAGE: "role.profile.manage",
      CONFIGURE: "role.profile.configure",
    },
  },
  AUDIT: { LOG: { READ: "audit.log.read", EXPORT: "audit.log.export" } },
  DOCUMENT: {
    FILE: {
      READ: "document.file.read",
      CREATE: "document.file.create",
      UPDATE: "document.file.update",
      DELETE: "document.file.delete",
      EXPORT: "document.file.export",
      VERIFY: "document.file.verify",
      DOWNLOAD: "document.file.download",
    },
  },
} as const;

export function isValidPermissionKey(key: string): boolean {
  return ALL_PERMISSION_KEYS.includes(key);
}

export function parsePermissionKey(key: string): {
  module: string;
  resource: string;
  action: string;
} | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  return { module: parts[0]!, resource: parts[1]!, action: parts[2]! };
}
