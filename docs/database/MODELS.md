# Atheron HRMS — Database Models Reference

Enterprise database layer documentation. Schema location: `prisma/schema/` (multi-file).

## Standard Fields (Auditable Entities)

Most business entities include:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `companyId` | UUID | Tenant isolation |
| `createdAt` | Timestamptz | Creation timestamp |
| `updatedAt` | Timestamptz | Last update |
| `createdBy` | UUID | Creator user |
| `updatedBy` | UUID | Last updater |
| `deletedAt` | Timestamptz | Soft delete |
| `deletedBy` | UUID | Who deleted |
| `version` | Int | Optimistic locking |
| `status` | Enum | Record status |
| `remarks` | Text | Notes |

**Exceptions:** AuditLog, ActivityLog, LoginHistory, Session — append-only/immutable patterns.

---

## Models Summary (51 Total)

### System

| Model | Table | Purpose |
|-------|-------|---------|
| **SchemaVersion** | `schema_versions` | Tracks applied schema versions |

### Organization

| Model | Table | Purpose | Key Relations |
|-------|-------|---------|---------------|
| **Company** | `companies` | Root tenant | → branches, employees, roles |
| **Branch** | `branches` | Office locations | company → departments, employees |
| **Department** | `departments` | Org hierarchy | company, branch, head employee |
| **Designation** | `designations` | Job titles | company → employees |

**Indexes:** `uq_companies_slug`, `uq_branches_company_code`, `uq_departments_company_code`

### Identity & Access

| Model | Table | Purpose | Key Relations |
|-------|-------|---------|---------------|
| **User** | `users` | Login accounts | company, employee, roles, sessions |
| **Role** | `roles` | RBAC roles | permissions via RolePermission |
| **Permission** | `permissions` | Atomic permissions | key format: module.resource.action |
| **RolePermission** | `role_permissions` | Role ↔ Permission junction | cascade delete |
| **UserRole** | `user_roles` | User ↔ Role with branch scope | user, role, branch |
| **Session** | `sessions` | Auth.js sessions | user, cascade delete |
| **LoginHistory** | `login_histories` | Security audit | immutable login attempts |

**Indexes:** `idx_users_email`, `uq_roles_company_slug`, `idx_sessions_user_id`

### Employee

| Model | Table | Purpose | Key Relations |
|-------|-------|---------|---------------|
| **Employee** | `employees` | Workforce master | company, branch, dept, designation, manager |
| **LeaveBalance** | `leave_balances` | Leave entitlement | employee, leave type, year |

**Indexes:** `uq_employees_company_code`, `uq_employees_company_email`, `idx_employees_phone`

### Attendance & Shift

| Model | Table | Purpose |
|-------|-------|---------|
| **Shift** | `shifts` | Work shift definitions |
| **ShiftAssignment** | `shift_assignments` | Employee shift roster |
| **Attendance** | `attendances` | Daily attendance summary |
| **AttendanceLog** | `attendance_logs` | Raw punch events |
| **GpsAttendance** | `gps_attendances` | GPS capture metadata |
| **QrAttendance** | `qr_attendances` | QR scan metadata |
| **FaceAttendance** | `face_attendances` | Face recognition metadata |
| **Holiday** | `holidays` | Company/branch holidays |

**Indexes:** `uq_attendance_employee_date`, `idx_attendance_company_date`

### Leave

| Model | Table | Purpose |
|-------|-------|---------|
| **LeaveType** | `leave_types` | Leave category config |
| **Leave** | `leaves` | Leave requests |
| **LeaveApproval** | `leave_approvals` | Multi-level approval chain |

**Indexes:** `idx_leaves_company_status`, `idx_leaves_date_range`

### Payroll

| Model | Table | Purpose |
|-------|-------|---------|
| **PayrollCycle** | `payroll_cycles` | Monthly/period definition |
| **SalaryStructure** | `salary_structures` | Salary templates |
| **SalaryComponent** | `salary_components` | Earning/deduction components |
| **EmployeeSalary** | `employee_salaries` | Employee salary assignment |
| **Payroll** | `payrolls` | Pay run batch |
| **PayrollItem** | `payroll_items` | Individual payslips |
| **Bonus** | `bonuses` | One-time bonuses |
| **Incentive** | `incentives` | Performance incentives |
| **Loan** | `loans` | Employee loans |
| **Advance** | `advances` | Salary advances |

**Indexes:** `uq_payroll_cycles_company_year_month`, `idx_payrolls_company_status`

### HR Modules

| Model | Table | Purpose |
|-------|-------|---------|
| **Asset** | `assets` | Company assets |
| **AssetAssignment** | `asset_assignments` | Asset ↔ Employee |
| **ExpenseCategory** | `expense_categories` | Expense types |
| **Expense** | `expenses` | Expense claims |
| **Recruitment** | `recruitments` | Job postings |
| **Candidate** | `candidates` | Applicants |
| **Interview** | `interviews` | Interview schedule |
| **Training** | `trainings` | Training records |
| **PerformanceReview** | `performance_reviews` | Performance cycles |

### System Services

| Model | Table | Purpose |
|-------|-------|---------|
| **Notification** | `notifications` | User notifications |
| **Announcement** | `announcements` | Company announcements |
| **AuditLog** | `audit_logs` | Immutable compliance audit |
| **ActivityLog** | `activity_logs` | General activity trail |
| **File** | `files` | Storage metadata |
| **Document** | `documents` | Employee documents |
| **Setting** | `settings` | System/company settings |

---

## Enums (27)

`RecordStatus`, `EmployeeStatus`, `EmploymentType`, `Gender`, `UserStatus`, `AttendanceStatus`, `AttendanceMethod`, `PunchType`, `ShiftType`, `LeaveStatus`, `PayrollStatus`, `PayrollCycleStatus`, `SalaryComponentType`, `PayFrequency`, `LoanStatus`, `AdvanceStatus`, `BonusStatus`, `IncentiveStatus`, `ExpenseStatus`, `AssetStatus`, `RecruitmentStatus`, `InterviewStatus`, `CandidateStatus`, `NotificationType`, `AnnouncementStatus`, `PermissionScope`, `FileCategory`, `HolidayType`, `TrainingStatus`, `PerformanceReviewStatus`, `AuditAction`, `SettingScope`, `SyncStatus`

---

## Seed Data

Run `npm run db:seed` after migration. Seeds:

- Default Company (`slug: default`)
- 4 system roles: Super Admin, HR Manager, Manager, Employee
- 24 permission placeholders
- Schema version `2.0.0-enterprise`

**No demo employees or users** — Authentication module creates first admin.

---

## Migrations

Initial migration: `prisma/migrations/20260724120000_init_enterprise_schema/`

```bash
docker compose -f docker/docker-compose.yml up -d
npm run db:migrate
npm run db:seed
```

---

## Repository Layer

| Module | Interface | Implementation |
|--------|-----------|----------------|
| Company | `CompanyRepository` | `PrismaCompanyRepository` |
| Employee | `EmployeeRepository` | `PrismaEmployeeRepository` |
| User | `UserRepository` | `PrismaUserRepository` |
| Role | `RoleRepository` | `PrismaRoleRepository` |
| Others | Placeholder | Phase-specific implementation |

---

## Future Usage

- **Authentication (Phase 2):** User, Session, LoginHistory, Role, Permission
- **Employee CRUD (Phase 2):** Employee, Department, Branch, Designation
- **Attendance (Phase 3):** Attendance, AttendanceLog, Gps/QR/FaceAttendance
- **Leave (Phase 3):** Leave, LeaveType, LeaveBalance, LeaveApproval
- **Payroll (Phase 4):** Payroll, PayrollItem, EmployeeSalary, SalaryStructure

See `docs/ARCHITECTURE.md` Section 7 for full entity planning.
