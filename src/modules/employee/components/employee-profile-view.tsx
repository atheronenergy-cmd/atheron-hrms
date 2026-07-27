"use client";

import { format } from "date-fns";
import { Pencil } from "lucide-react";
import Link from "next/link";

import { PermissionButton } from "@/components/permissions/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeDocumentsPanel } from "@/modules/document/components/employee-documents-panel";
import { EmployeeFinancialPanel } from "@/modules/employee-financial/components/employee-financial-panel";
import type { EmployeeFinancialSummary } from "@/modules/employee-financial/domain/types";
import { EmployeeLifecyclePanel } from "@/modules/employee-lifecycle/components/employee-lifecycle-panel";
import type { EmployeeLifecycleSummary } from "@/modules/employee-lifecycle/domain/types";
import { EmployeeStatusBadge } from "@/modules/employee/components/employee-status-badge";
import { EmployeeTimeline } from "@/modules/employee/components/employee-timeline";
import {
  EMPLOYEE_ROUTES,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
  type EmployeeProfile,
  type EmployeeTimelineItem,
} from "@/modules/employee/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type EmployeeProfileViewProps = {
  employee: EmployeeProfile;
  timeline: EmployeeTimelineItem[];
  photoUrl?: string | null;
  documentCategories?: import("@/modules/document/domain/types").DocumentCategoryItem[];
  documents?: import("@/modules/document/domain/types").DocumentListItem[];
  financialSummary?: EmployeeFinancialSummary | null;
  canViewFinancial?: boolean;
  lifecycleSummary?: EmployeeLifecycleSummary | null;
  canViewLifecycle?: boolean;
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export function EmployeeProfileView({ employee, timeline, photoUrl, documentCategories = [], documents = [], financialSummary = null, canViewFinancial = false, lifecycleSummary = null, canViewLifecycle = false }: EmployeeProfileViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{employee.fullName}</CardTitle>
            <CardDescription>{employee.employeeCode} · {employee.designationName}</CardDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <EmployeeStatusBadge status={employee.employmentStatus} />
              <Badge variant="outline">{EMPLOYMENT_TYPE_LABELS[employee.employmentType] ?? employee.employmentType}</Badge>
            </div>
          </div>
          <PermissionButton permission={PERMISSIONS.EMPLOYEE.PROFILE.UPDATE} asChild>
            <Link href={EMPLOYEE_ROUTES.edit(employee.id)}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
          </PermissionButton>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          {canViewFinancial ? <TabsTrigger value="financial">Financial</TabsTrigger> : null}
          {canViewLifecycle ? <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger> : null}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader><CardTitle className="text-sm">Documents</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">See Documents tab for files and verification status.</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Salary</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Coming in a future module</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Attendance</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Coming in a future module</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="pt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Preferred Name" value={employee.preferredName} />
              <Field label="Gender" value={employee.gender ? GENDER_LABELS[employee.gender] : null} />
              <Field label="Date of Birth" value={employee.dateOfBirth ? format(new Date(employee.dateOfBirth), "dd MMM yyyy") : null} />
              <Field label="Blood Group" value={employee.bloodGroup} />
              <Field label="Nationality" value={employee.nationality} />
              <Field label="Marital Status" value={employee.maritalStatus} />
              <Field label="Father Name" value={employee.fatherName} />
              <Field label="Mother Name" value={employee.motherName} />
              <Field label="Spouse Name" value={employee.spouseName} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="pt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Branch" value={employee.branchName} />
              <Field label="Department" value={employee.departmentName} />
              <Field label="Designation" value={employee.designationName} />
              <Field label="Reporting Manager" value={employee.reportingManagerName} />
              <Field label="Joining Date" value={format(new Date(employee.dateOfJoining), "dd MMM yyyy")} />
              <Field label="Confirmation Date" value={employee.confirmationDate ? format(new Date(employee.confirmationDate), "dd MMM yyyy") : null} />
              <Field label="Work Location" value={employee.workLocation} />
              <Field label="Probation Status" value={employee.probationStatus} />
              <Field label="Notice Period (days)" value={employee.noticePeriodDays?.toString()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="pt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <Field label="Company Email" value={employee.email} />
              <Field label="Personal Email" value={employee.personalEmail} />
              <Field label="Primary Mobile" value={employee.phone} />
              <Field label="Alternate Mobile" value={employee.alternatePhone} />
              <Field label="Emergency Contact" value={employee.emergencyContact.name} />
              <Field label="Emergency Phone" value={employee.emergencyContact.phone} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="identity" className="pt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Aadhaar" value={employee.identityDocuments.aadhaar} />
              <Field label="PAN" value={employee.identityDocuments.pan} />
              <Field label="Passport" value={employee.identityDocuments.passport} />
              <Field label="Driving Licence" value={employee.identityDocuments.drivingLicence} />
              <Field label="Voter ID" value={employee.identityDocuments.voterId} />
              <Field label="UAN" value={employee.identityDocuments.uan} />
              <Field label="ESIC" value={employee.identityDocuments.esicNumber} />
            </CardContent>
          </Card>
        </TabsContent>

        {canViewFinancial && financialSummary ? (
          <TabsContent value="financial" className="pt-4">
            <EmployeeFinancialPanel employeeId={employee.id} summary={financialSummary} />
          </TabsContent>
        ) : null}

        {canViewLifecycle && lifecycleSummary ? (
          <TabsContent value="lifecycle" className="pt-4">
            <EmployeeLifecyclePanel employeeId={employee.id} summary={lifecycleSummary} designationId={employee.designationId} />
          </TabsContent>
        ) : null}

        <TabsContent value="documents" className="pt-4">
          <EmployeeDocumentsPanel
            employeeId={employee.id}
            photoUrl={photoUrl}
            categories={documentCategories}
            documents={documents}
          />
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Employee Timeline</CardTitle></CardHeader>
            <CardContent><EmployeeTimeline events={timeline} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
