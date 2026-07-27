"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { PermissionGuard } from "@/components/permissions/permission-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  approveJoiningAction,
  confirmEmployeeAction,
  createProbationAction,
  initJoiningAction,
  issueWarningAction,
  promoteEmployeeAction,
  recordSalaryRevisionAction,
  submitResignationAction,
  transferEmployeeAction,
  updateJoiningChecklistAction,
} from "@/modules/employee-lifecycle/actions/employee-lifecycle.actions";
import { ApprovalTimeline } from "@/modules/employee-lifecycle/components/approval-timeline";
import { CareerTimeline } from "@/modules/employee-lifecycle/components/career-timeline";
import { ClearanceChecklist } from "@/modules/employee-lifecycle/components/clearance-checklist";
import { HistoryTable } from "@/modules/employee-lifecycle/components/history-table";
import { LifecycleStatusBadge } from "@/modules/employee-lifecycle/components/lifecycle-status-badge";
import { WorkflowCard } from "@/modules/employee-lifecycle/components/workflow-card";
import type { EmployeeLifecycleSummary } from "@/modules/employee-lifecycle/domain/types";
import { LIFECYCLE_SECTIONS, PROBATION_STATUS_LABELS, RESIGNATION_REASON_LABELS } from "@/modules/employee-lifecycle/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type EmployeeLifecyclePanelProps = {
  employeeId: string;
  summary: EmployeeLifecycleSummary;
  designationId: string;
};

export function EmployeeLifecyclePanel({ employeeId, summary, designationId }: EmployeeLifecyclePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredTransfers = useMemo(() => {
    if (!search) return summary.transfers;
    const q = search.toLowerCase();
    return summary.transfers.filter((t) => t.previousValue.toLowerCase().includes(q) || t.newValue.toLowerCase().includes(q));
  }, [summary.transfers, search]);

  async function refresh(msg: string) {
    setMessage(msg);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <WorkflowCard notifications={summary.notifications} />
      <ApprovalTimeline workflows={summary.pendingWorkflows} />

      <Tabs defaultValue="career">
        <TabsList className="flex h-auto flex-wrap">
          {LIFECYCLE_SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="career" className="pt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Career Timeline</CardTitle></CardHeader>
            <CardContent><CareerTimeline events={summary.journeyEvents} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="joining" className="space-y-4 pt-4">
          {summary.joining ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Joining Checklist</CardTitle>
                <LifecycleStatusBadge status={summary.joining.status} />
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.joining.checklist.map((item) => (
                  <div key={item.code} className="flex items-center justify-between rounded-md border p-3">
                    <span>{item.label}</span>
                    <PermissionGuard permission={PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE}>
                      <Button
                        size="sm"
                        variant={item.completed ? "default" : "outline"}
                        disabled={pending}
                        onClick={async () => {
                          const result = await updateJoiningChecklistAction({
                            employeeId,
                            version: summary.joining!.version,
                            code: item.code,
                            completed: !item.completed,
                          });
                          await refresh(result.message);
                        }}
                      >
                        {item.completed ? "Done" : "Mark Done"}
                      </Button>
                    </PermissionGuard>
                  </div>
                ))}
                <div className="flex gap-2">
                  <PermissionGuard permission={PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE}>
                    <Button size="sm" disabled={pending} onClick={async () => {
                      const result = await approveJoiningAction({ employeeId, version: summary.joining!.version, approverType: "manager" });
                      await refresh(result.message);
                    }}>Manager Approve</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={async () => {
                      const result = await approveJoiningAction({ employeeId, version: summary.joining!.version, approverType: "hr" });
                      await refresh(result.message);
                    }}>HR Approve</Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          ) : (
            <PermissionGuard permission={PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE}>
              <Button disabled={pending} onClick={async () => {
                const result = await initJoiningAction({ employeeId, joiningDate: new Date().toISOString().slice(0, 10) });
                await refresh(result.message);
              }}>Start Joining Workflow</Button>
            </PermissionGuard>
          )}
        </TabsContent>

        <TabsContent value="probation" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.PROBATION.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Start Probation</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const start = String(fd.get("startDate"));
                  const end = String(fd.get("endDate"));
                  const result = await createProbationAction({ employeeId, startDate: start, endDate: end });
                  await refresh(result.message);
                  if (result.success) e.currentTarget.reset();
                }}>
                  <Field name="startDate" label="Start Date" type="date" required />
                  <Field name="endDate" label="End Date" type="date" required />
                  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Create Probation</Button></div>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
          <HistoryTable
            title="Probation Records"
            items={summary.probations}
            columns={[
              { key: "startDate", header: "Start" },
              { key: "endDate", header: "End" },
              { key: "status", header: "Status", render: (r) => PROBATION_STATUS_LABELS[r.status] ?? r.status },
            ]}
          />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4 pt-4">
          <HistoryTable
            title="Transfer History"
            items={filteredTransfers}
            search={search}
            onSearchChange={setSearch}
            columns={[
              { key: "transferType", header: "Type" },
              { key: "previousValue", header: "From" },
              { key: "newValue", header: "To" },
              { key: "effectiveDate", header: "Effective" },
            ]}
          />
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.TRANSFER.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Record Transfer</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const result = await transferEmployeeAction({
                    employeeId,
                    transferType: String(fd.get("transferType")) as "department",
                    newValue: String(fd.get("newValue")),
                    effectiveDate: String(fd.get("effectiveDate")),
                    reason: String(fd.get("reason") ?? "") || undefined,
                  });
                  await refresh(result.message);
                }}>
                  <Field name="transferType" label="Type" defaultValue="department" />
                  <Field name="newValue" label="New Value" required />
                  <Field name="effectiveDate" label="Effective Date" type="date" required />
                  <Field name="reason" label="Reason" />
                  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Transfer</Button></div>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4 pt-4">
          <HistoryTable title="Promotion History" items={summary.promotions} columns={[
            { key: "promotionDate", header: "Date" },
            { key: "previousDesignation", header: "From" },
            { key: "newDesignation", header: "To" },
          ]} />
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.PROMOTION.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Record Promotion</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const result = await promoteEmployeeAction({
                    employeeId,
                    newDesignationId: String(fd.get("newDesignationId") || designationId),
                    promotionDate: String(fd.get("promotionDate")),
                    comments: String(fd.get("comments") ?? "") || undefined,
                  });
                  await refresh(result.message);
                }}>
                  <Field name="promotionDate" label="Promotion Date" type="date" required />
                  <Field name="newDesignationId" label="New Designation ID" defaultValue={designationId} />
                  <Field name="comments" label="Comments" />
                  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Promotion</Button></div>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4 pt-4">
          <HistoryTable title="Salary Revision History" items={summary.salaryRevisions} columns={[
            { key: "effectiveDate", header: "Effective" },
            { key: "previousSalary", header: "Previous" },
            { key: "newSalary", header: "New" },
            { key: "revisionType", header: "Type" },
          ]} />
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Record Salary Revision</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const result = await recordSalaryRevisionAction({
                    employeeId,
                    newSalary: Number(fd.get("newSalary")),
                    effectiveDate: String(fd.get("effectiveDate")),
                    revisionType: String(fd.get("revisionType")) as "annual_increment",
                    reason: String(fd.get("reason") ?? "") || undefined,
                  });
                  await refresh(result.message);
                }}>
                  <Field name="newSalary" label="New Salary" type="number" required />
                  <Field name="effectiveDate" label="Effective Date" type="date" required />
                  <Field name="revisionType" label="Type" defaultValue="annual_increment" />
                  <Field name="reason" label="Reason" />
                  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Revision</Button></div>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4 pt-4">
          <HistoryTable title="Warnings" items={summary.warnings} columns={[
            { key: "issuedDate", header: "Date" },
            { key: "warningType", header: "Type" },
            { key: "reason", header: "Reason" },
          ]} />
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.LIFECYCLE.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Issue Warning</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const result = await issueWarningAction({
                    employeeId,
                    warningType: String(fd.get("warningType")) as "performance",
                    reason: String(fd.get("reason")),
                    issuedDate: String(fd.get("issuedDate")),
                  });
                  await refresh(result.message);
                }}>
                  <Field name="warningType" label="Type" defaultValue="performance" />
                  <Field name="issuedDate" label="Issued Date" type="date" required />
                  <Field name="reason" label="Reason" required />
                  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Issue Warning</Button></div>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="resignation" className="space-y-4 pt-4">
          {summary.alumni ? (
            <Card><CardContent className="pt-6"><p className="text-sm">Alumni since {summary.alumni.exitDate}. Last role: {summary.alumni.lastDesignation} · {summary.alumni.lastDepartment}</p></CardContent></Card>
          ) : null}
          <HistoryTable title="Resignations" items={summary.resignations} columns={[
            { key: "resignationDate", header: "Submitted" },
            { key: "lastWorkingDate", header: "LWD" },
            { key: "reason", header: "Reason", render: (r) => RESIGNATION_REASON_LABELS[r.reason] ?? r.reason },
            { key: "approvalStatus", header: "Status", render: (r) => r.approvalStatus },
          ]} />
          {summary.exitClearance ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Exit Clearance</CardTitle></CardHeader>
              <CardContent>
                <ClearanceChecklist clearance={summary.exitClearance} onUpdated={() => refresh("Clearance updated.")} />
              </CardContent>
            </Card>
          ) : null}
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.RESIGNATION.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Submit Resignation</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const result = await submitResignationAction({
                    employeeId,
                    resignationDate: String(fd.get("resignationDate")),
                    lastWorkingDate: String(fd.get("lastWorkingDate")),
                    reason: String(fd.get("reason")) as "personal",
                  });
                  await refresh(result.message);
                }}>
                  <Field name="resignationDate" label="Resignation Date" type="date" required />
                  <Field name="lastWorkingDate" label="Last Working Date" type="date" required />
                  <Field name="reason" label="Reason" defaultValue="personal" />
                  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Submit Resignation</Button></div>
                </form>
              </CardContent>
            </Card>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.CONFIRMATION.MANAGE}>
            <Card>
              <CardHeader><CardTitle className="text-base">Confirm Employee</CardTitle></CardHeader>
              <CardContent>
                <Button disabled={pending} onClick={async () => {
                  const result = await confirmEmployeeAction({ employeeId, confirmationDate: new Date().toISOString().slice(0, 10) });
                  await refresh(result.message);
                }}>Confirm Employee</Button>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
    </div>
  );
}
