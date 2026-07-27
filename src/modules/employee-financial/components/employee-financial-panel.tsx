"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { PermissionGuard } from "@/components/permissions/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBankDetailAction,
  createEmergencyContactAction,
  createFamilyMemberAction,
  createInsuranceAction,
  createNomineeAction,
  upsertStatutoryAction,
  upsertTaxProfileAction,
  verifyBankDetailAction,
} from "@/modules/employee-financial/actions/employee-financial.actions";
import type { EmployeeFinancialSummary } from "@/modules/employee-financial/domain/types";
import { FINANCIAL_SECTIONS } from "@/modules/employee-financial/domain/types";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type EmployeeFinancialPanelProps = {
  employeeId: string;
  summary: EmployeeFinancialSummary;
};

function StatusBadge({ status }: { status: string }) {
  const variant = status === "verified" || status === "active" ? "default" : status === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export function EmployeeFinancialPanel({ employeeId, summary }: EmployeeFinancialPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredBank = useMemo(() => {
    if (!search) return summary.bankDetails;
    const q = search.toLowerCase();
    return summary.bankDetails.filter(
      (b) => b.bankName.toLowerCase().includes(q) || b.accountHolderName.toLowerCase().includes(q),
    );
  }, [summary.bankDetails, search]);

  async function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <div className="flex items-center gap-2">
        <Input placeholder="Search bank records…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <Tabs defaultValue="bank">
        <TabsList className="flex h-auto flex-wrap">
          {FINANCIAL_SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="bank" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.BANK.MANAGE}>
            <BankDetailsForm
              employeeId={employeeId}
              pending={pending}
              onDone={async (msg) => {
                setMessage(msg);
                await refresh();
              }}
            />
          </PermissionGuard>
          <Card>
            <CardHeader><CardTitle className="text-base">Bank Accounts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {filteredBank.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bank details recorded.</p>
              ) : (
                filteredBank.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <div>
                      <p className="font-medium">{b.bankName} · {b.accountHolderName}</p>
                      <p className="text-sm text-muted-foreground">A/C {b.accountNumber} · IFSC {b.ifscCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={b.verificationStatus} />
                      <PermissionGuard permission={PERMISSIONS.EMPLOYEE.BANK.MANAGE}>
                        {b.verificationStatus === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={async () => {
                                const result = await verifyBankDetailAction({ id: b.id, version: b.version, status: "verified" });
                                setMessage(result.message);
                                if (result.success) await refresh();
                              }}
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={async () => {
                                const result = await verifyBankDetailAction({ id: b.id, version: b.version, status: "rejected" });
                                setMessage(result.message);
                                if (result.success) await refresh();
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </PermissionGuard>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.FAMILY.MANAGE}>
            <EmergencyContactForm employeeId={employeeId} pending={pending} onDone={async (msg) => { setMessage(msg); await refresh(); }} />
          </PermissionGuard>
          <FinancialListCard title="Emergency Contacts" empty="No emergency contacts." items={summary.emergencyContacts.map((c) => ({
            id: c.id,
            title: c.name,
            subtitle: `${c.relation} · ${c.mobile}${c.isPrimary ? " · Primary" : ""}`,
          }))} />
        </TabsContent>

        <TabsContent value="family" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.FAMILY.MANAGE}>
            <FamilyMemberForm employeeId={employeeId} pending={pending} onDone={async (msg) => { setMessage(msg); await refresh(); }} />
          </PermissionGuard>
          <FinancialListCard title="Family Members" empty="No family members." items={summary.familyMembers.map((m) => ({
            id: m.id,
            title: m.name,
            subtitle: `${m.relation}${m.isDependent ? " · Dependent" : ""}`,
          }))} />
        </TabsContent>

        <TabsContent value="nominee" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Total allocation: {summary.nomineeTotalPercentage}% {summary.nomineeTotalPercentage === 100 ? "✓" : "(must equal 100%)"}
          </p>
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.FAMILY.MANAGE}>
            <NomineeForm employeeId={employeeId} pending={pending} onDone={async (msg) => { setMessage(msg); await refresh(); }} />
          </PermissionGuard>
          <FinancialListCard title="Nominees" empty="No nominees." items={summary.nominees.map((n) => ({
            id: n.id,
            title: n.name,
            subtitle: `${n.relation} · ${n.percentage}% · ${n.nomineeType}`,
          }))} />
        </TabsContent>

        <TabsContent value="statutory" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.STATUTORY.MANAGE}>
            <StatutoryForm employeeId={employeeId} initial={summary.statutory} pending={pending} onDone={async (msg) => { setMessage(msg); await refresh(); }} />
          </PermissionGuard>
          {summary.statutory ? (
            <Card>
              <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                <Field label="PF Number" value={summary.statutory.pfNumber} />
                <Field label="UAN" value={summary.statutory.uanNumber} />
                <Field label="ESI Number" value={summary.statutory.esiNumber} />
                <Field label="ESI Eligible" value={summary.statutory.esiEligible ? "Yes" : "No"} />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No statutory profile yet.</p>
          )}
        </TabsContent>

        <TabsContent value="tax" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.TAX.MANAGE}>
            <TaxForm employeeId={employeeId} initial={summary.tax} pending={pending} onDone={async (msg) => { setMessage(msg); await refresh(); }} />
          </PermissionGuard>
          {summary.tax ? (
            <Card>
              <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
                <Field label="PAN" value={summary.tax.panNumber} />
                <Field label="Tax Regime" value={summary.tax.taxRegime} />
                <Field label="Financial Year" value={summary.tax.financialYear} />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No tax profile yet.</p>
          )}
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4 pt-4">
          <PermissionGuard permission={PERMISSIONS.EMPLOYEE.INSURANCE.MANAGE}>
            <InsuranceForm employeeId={employeeId} pending={pending} onDone={async (msg) => { setMessage(msg); await refresh(); }} />
          </PermissionGuard>
          <FinancialListCard title="Insurance Policies" empty="No insurance policies." items={summary.insurance.map((i) => ({
            id: i.id,
            title: i.provider,
            subtitle: `${i.policyNumber} · ${i.policyStatus}`,
          }))} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function FinancialListCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; subtitle: string }>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function BankDetailsForm({
  employeeId,
  pending,
  onDone,
}: {
  employeeId: string;
  pending: boolean;
  onDone: (msg: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Bank Details</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await createBankDetailAction({
              employeeId,
              accountHolderName: String(fd.get("accountHolderName") ?? ""),
              bankName: String(fd.get("bankName") ?? ""),
              branchName: String(fd.get("branchName") ?? "") || undefined,
              accountNumber: String(fd.get("accountNumber") ?? ""),
              ifscCode: String(fd.get("ifscCode") ?? ""),
              accountType: String(fd.get("accountType") ?? "savings"),
              upiId: String(fd.get("upiId") ?? "") || undefined,
              isPrimary: true,
            });
            await onDone(result.message);
            if (result.success) e.currentTarget.reset();
          }}
        >
          <FieldInput name="accountHolderName" label="Account Holder Name" required />
          <FieldInput name="bankName" label="Bank Name" required />
          <FieldInput name="branchName" label="Branch Name" />
          <FieldInput name="accountNumber" label="Account Number" required />
          <FieldInput name="ifscCode" label="IFSC Code" required />
          <div>
            <Label htmlFor="accountType">Account Type</Label>
            <select id="accountType" name="accountType" defaultValue="savings" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>
          <FieldInput name="upiId" label="UPI ID" />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>Save Bank Details</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EmergencyContactForm({ employeeId, pending, onDone }: { employeeId: string; pending: boolean; onDone: (msg: string) => Promise<void> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Emergency Contact</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await createEmergencyContactAction({
              employeeId,
              name: String(fd.get("name") ?? ""),
              relation: String(fd.get("relation") ?? ""),
              mobile: String(fd.get("mobile") ?? ""),
              email: String(fd.get("email") ?? "") || undefined,
              priority: Number(fd.get("priority") ?? 1),
              isPrimary: fd.get("isPrimary") === "on",
            });
            await onDone(result.message);
            if (result.success) e.currentTarget.reset();
          }}
        >
          <FieldInput name="name" label="Name" required />
          <FieldInput name="relation" label="Relation" required />
          <FieldInput name="mobile" label="Mobile" required />
          <FieldInput name="email" label="Email" type="email" />
          <FieldInput name="priority" label="Priority" type="number" defaultValue="1" />
          <div className="flex items-center gap-2 pt-6">
            <input id="isPrimary" name="isPrimary" type="checkbox" />
            <Label htmlFor="isPrimary">Primary contact</Label>
          </div>
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Contact</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function FamilyMemberForm({ employeeId, pending, onDone }: { employeeId: string; pending: boolean; onDone: (msg: string) => Promise<void> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Family Member</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await createFamilyMemberAction({
              employeeId,
              name: String(fd.get("name") ?? ""),
              relation: String(fd.get("relation") ?? "other") as "spouse" | "child" | "parent" | "other",
              occupation: String(fd.get("occupation") ?? "") || undefined,
              isDependent: fd.get("isDependent") === "on",
            });
            await onDone(result.message);
            if (result.success) e.currentTarget.reset();
          }}
        >
          <FieldInput name="name" label="Name" required />
          <div>
            <Label htmlFor="relation">Relation</Label>
            <select id="relation" name="relation" defaultValue="spouse" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FieldInput name="occupation" label="Occupation" />
          <div className="flex items-center gap-2 pt-6">
            <input id="isDependent" name="isDependent" type="checkbox" />
            <Label htmlFor="isDependent">Dependent</Label>
          </div>
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Family Member</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function NomineeForm({ employeeId, pending, onDone }: { employeeId: string; pending: boolean; onDone: (msg: string) => Promise<void> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Nominee</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await createNomineeAction({
              employeeId,
              name: String(fd.get("name") ?? ""),
              relation: String(fd.get("relation") ?? ""),
              percentage: Number(fd.get("percentage") ?? 0),
              nomineeType: String(fd.get("nomineeType") ?? "general"),
              mobile: String(fd.get("mobile") ?? "") || undefined,
            });
            await onDone(result.message);
            if (result.success) e.currentTarget.reset();
          }}
        >
          <FieldInput name="name" label="Name" required />
          <FieldInput name="relation" label="Relation" required />
          <FieldInput name="percentage" label="Percentage" type="number" required />
          <FieldInput name="nomineeType" label="Nominee Type" defaultValue="general" required />
          <FieldInput name="mobile" label="Mobile" />
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Nominee</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function StatutoryForm({
  employeeId,
  initial,
  pending,
  onDone,
}: {
  employeeId: string;
  initial: EmployeeFinancialSummary["statutory"];
  pending: boolean;
  onDone: (msg: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Statutory Information</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await upsertStatutoryAction({
              employeeId,
              pfNumber: String(fd.get("pfNumber") ?? "") || undefined,
              uanNumber: String(fd.get("uanNumber") ?? "") || undefined,
              esiNumber: String(fd.get("esiNumber") ?? "") || undefined,
              esiEligible: fd.get("esiEligible") === "on",
              pfContributionType: String(fd.get("pfContributionType") ?? "") || undefined,
              professionalTaxApplicable: fd.get("professionalTaxApplicable") === "on",
              lwfApplicable: fd.get("lwfApplicable") === "on",
            });
            await onDone(result.message);
          }}
        >
          <FieldInput name="pfNumber" label="PF Number" defaultValue={initial?.pfNumber ?? ""} />
          <FieldInput name="uanNumber" label="UAN Number" defaultValue={initial?.uanNumber ?? ""} />
          <FieldInput name="esiNumber" label="ESI Number" defaultValue={initial?.esiNumber ?? ""} />
          <FieldInput name="pfContributionType" label="PF Contribution Type" defaultValue={initial?.pfContributionType ?? ""} />
          <div className="flex items-center gap-2"><input id="esiEligible" name="esiEligible" type="checkbox" defaultChecked={initial?.esiEligible} /><Label htmlFor="esiEligible">ESI Eligible</Label></div>
          <div className="flex items-center gap-2"><input id="professionalTaxApplicable" name="professionalTaxApplicable" type="checkbox" defaultChecked={initial?.professionalTaxApplicable} /><Label htmlFor="professionalTaxApplicable">Professional Tax</Label></div>
          <div className="flex items-center gap-2"><input id="lwfApplicable" name="lwfApplicable" type="checkbox" defaultChecked={initial?.lwfApplicable} /><Label htmlFor="lwfApplicable">Labour Welfare Fund</Label></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Statutory</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function TaxForm({
  employeeId,
  initial,
  pending,
  onDone,
}: {
  employeeId: string;
  initial: EmployeeFinancialSummary["tax"];
  pending: boolean;
  onDone: (msg: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tax Profile</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await upsertTaxProfileAction({
              employeeId,
              panNumber: String(fd.get("panNumber") ?? "") || undefined,
              taxRegime: (String(fd.get("taxRegime") ?? "") || undefined) as "old" | "new" | undefined,
              financialYear: String(fd.get("financialYear") ?? "") || undefined,
            });
            await onDone(result.message);
          }}
        >
          <FieldInput name="panNumber" label="PAN Number" defaultValue={initial?.panNumber ?? ""} />
          <div>
            <Label htmlFor="taxRegime">Tax Regime</Label>
            <select id="taxRegime" name="taxRegime" defaultValue={initial?.taxRegime ?? "new"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="old">Old Regime</option>
              <option value="new">New Regime</option>
            </select>
          </div>
          <FieldInput name="financialYear" label="Financial Year" defaultValue={initial?.financialYear ?? "2025-26"} />
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Tax Profile</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function InsuranceForm({ employeeId, pending, onDone }: { employeeId: string; pending: boolean; onDone: (msg: string) => Promise<void> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Insurance Policy</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const result = await createInsuranceAction({
              employeeId,
              provider: String(fd.get("provider") ?? ""),
              policyNumber: String(fd.get("policyNumber") ?? ""),
              coverageAmount: Number(fd.get("coverageAmount") ?? 0) || undefined,
              nomineeName: String(fd.get("nomineeName") ?? "") || undefined,
              policyStatus: "active",
            });
            await onDone(result.message);
            if (result.success) e.currentTarget.reset();
          }}
        >
          <FieldInput name="provider" label="Insurance Provider" required />
          <FieldInput name="policyNumber" label="Policy Number" required />
          <FieldInput name="coverageAmount" label="Coverage Amount" type="number" />
          <FieldInput name="nomineeName" label="Nominee" />
          <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Save Insurance</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldInput({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
    </div>
  );
}
