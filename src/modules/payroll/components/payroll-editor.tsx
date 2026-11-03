"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addStandardSalaryComponentsAction,
  approveEmployeeSalaryAction,
  assignEmployeeSalaryAction,
  createSalaryComponentAction,
  createSalaryStructureAction,
} from "@/modules/payroll/actions/salary.actions";
import { createPayrollPeriodAction, generatePayrollAction } from "@/modules/payroll/actions/payroll.actions";

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

type Option = { id: string; label: string };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function SalaryStructureForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createSalaryStructureAction({
        name: formData.get("name"),
        code: formData.get("code"),
        payFrequency: formData.get("payFrequency") || "monthly",
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-3">
      <Field label="Name">
        <Input name="name" required placeholder="Engineer" />
      </Field>
      <Field label="Code">
        <Input name="code" required placeholder="ENGINEER" />
      </Field>
      <Field label="Pay frequency">
        <select name="payFrequency" className={selectClass} defaultValue="monthly">
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
          <option value="hourly">Hourly</option>
        </select>
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create structure"}</Button>
      </div>
    </form>
  );
}

export function SalaryComponentForm({ structures }: { structures: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const componentType = String(formData.get("componentType") || "earning");
      const result = await createSalaryComponentAction({
        salaryStructureId: formData.get("salaryStructureId"),
        name: formData.get("name"),
        code: formData.get("code"),
        componentType,
        calculationType: formData.get("calculationType") || "fixed",
        amount: formData.get("amount") || 0,
        percentageOf: formData.get("percentageOf") || undefined,
        percentageValue: formData.get("percentageValue") || undefined,
        affectsGross: componentType === "earning",
        isTaxable: componentType === "earning",
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-3">
      <Field label="Structure">
        <select name="salaryStructureId" required className={selectClass} defaultValue="">
          <option value="" disabled>Select structure</option>
          {structures.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Name">
        <Input name="name" required placeholder="HRA" />
      </Field>
      <Field label="Code">
        <Input name="code" required placeholder="HRA" />
      </Field>
      <Field label="Kind">
        <select name="componentType" className={selectClass} defaultValue="earning">
          <option value="earning">Earning</option>
          <option value="deduction">Deduction</option>
        </select>
      </Field>
      <Field label="Calculation">
        <select name="calculationType" className={selectClass} defaultValue="percentage">
          <option value="fixed">Fixed amount</option>
          <option value="percentage">Percentage</option>
          <option value="formula">Formula</option>
          <option value="computed">Computed</option>
        </select>
      </Field>
      <Field label="Amount or percent">
        <Input name="amount" type="number" min="0" step="0.01" defaultValue="0" />
      </Field>
      <Field label="Percentage of">
        <Input name="percentageOf" placeholder="BASIC" />
      </Field>
      <Field label="Percentage value">
        <Input name="percentageValue" type="number" min="0" max="100" step="0.01" placeholder="40" />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending || structures.length === 0}>{pending ? "Saving…" : "Add component"}</Button>
      </div>
    </form>
  );
}

export function StandardComponentsButton({ structures }: { structures: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [structureId, setStructureId] = useState(structures[0]?.id ?? "");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Structure">
        <select className={selectClass} value={structureId} onChange={(event) => setStructureId(event.target.value)}>
          {structures.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <Button
        type="button"
        variant="outline"
        disabled={pending || !structureId}
        onClick={() => {
          startTransition(async () => {
            const result = await addStandardSalaryComponentsAction({ salaryStructureId: structureId });
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success(result.message);
            router.refresh();
          });
        }}
      >
        {pending ? "Adding…" : "Add Basic, HRA, DA, PF, ESI"}
      </Button>
    </div>
  );
}

export function EmployeeSalaryForm({ employees, structures }: { employees: Option[]; structures: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const baseSalary = Number(formData.get("baseSalary") || 0);
      const monthlyCtc = Number(formData.get("monthlyCtc") || baseSalary);
      const assigned = await assignEmployeeSalaryAction({
        employeeId: formData.get("employeeId"),
        salaryStructureId: formData.get("salaryStructureId"),
        baseSalary,
        monthlyCtc,
        annualCtc: monthlyCtc * 12,
        effectiveFrom: formData.get("effectiveFrom"),
        submitForApproval: true,
      });
      if (!assigned.success || !assigned.data?.id) {
        toast.error(assigned.message);
        return;
      }
      const approved = await approveEmployeeSalaryAction({ id: assigned.data.id, version: 1 });
      if (!approved.success) {
        toast.error(approved.message);
        return;
      }
      toast.success("Salary saved and approved. Payroll can use it.");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Employee">
        <select name="employeeId" required className={selectClass} defaultValue="">
          <option value="" disabled>Select employee</option>
          {employees.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Salary structure">
        <select name="salaryStructureId" required className={selectClass} defaultValue="">
          <option value="" disabled>Select structure</option>
          {structures.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Monthly basic">
        <Input name="baseSalary" type="number" min="0" step="0.01" required placeholder="25000" />
      </Field>
      <Field label="Monthly CTC">
        <Input name="monthlyCtc" type="number" min="0" step="0.01" required placeholder="40000" />
      </Field>
      <Field label="Effective from">
        <Input name="effectiveFrom" type="date" required />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={pending || employees.length === 0 || structures.length === 0}>
          {pending ? "Saving…" : "Save and approve salary"}
        </Button>
      </div>
    </form>
  );
}

export function ApproveSalaryButton({ id, version }: { id: string; version: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await approveEmployeeSalaryAction({ id, version });
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}

export function PayrollPeriodForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPayrollPeriodAction({
        name: formData.get("name"),
        periodType: "monthly",
        payrollYear: formData.get("payrollYear"),
        payrollMonth: formData.get("payrollMonth"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        payDate: formData.get("payDate") || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-3">
      <Field label="Name">
        <Input name="name" required defaultValue={`${today.toLocaleString("en", { month: "long" })} ${year}`} />
      </Field>
      <Field label="Year">
        <Input name="payrollYear" type="number" required defaultValue={year} />
      </Field>
      <Field label="Month">
        <Input name="payrollMonth" type="number" min="1" max="12" required defaultValue={month} />
      </Field>
      <Field label="Start">
        <Input name="startDate" type="date" required defaultValue={start} />
      </Field>
      <Field label="End">
        <Input name="endDate" type="date" required defaultValue={end} />
      </Field>
      <Field label="Pay date">
        <Input name="payDate" type="date" defaultValue={end} />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create payroll month"}</Button>
      </div>
    </form>
  );
}

export function GeneratePayrollForm({
  periods,
  employees,
}: {
  periods: Option[];
  employees: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const employeeId = String(formData.get("employeeId") || "");
      const result = await generatePayrollAction({
        payrollPeriodId: formData.get("payrollPeriodId"),
        scope: employeeId ? "employee" : "company",
        employeeId: employeeId || undefined,
        previewOnly: formData.get("previewOnly") === "on",
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const warnings = result.data && typeof result.data === "object" && "warnings" in result.data
        ? (result.data as { warnings?: string[] }).warnings ?? []
        : [];
      toast.success(result.message);
      if (warnings.length > 0) toast.message(warnings.slice(0, 4).join(" · "));
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Payroll month">
        <select name="payrollPeriodId" required className={selectClass} defaultValue="">
          <option value="" disabled>Select month</option>
          {periods.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <Field label="Employee">
        <select name="employeeId" className={selectClass} defaultValue="">
          <option value="">All active employees</option>
          {employees.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="previewOnly" type="checkbox" className="h-4 w-4" />
        Preview only, do not save the pay run
      </label>
      <div>
        <Button type="submit" disabled={pending || periods.length === 0}>{pending ? "Running…" : "Run payroll"}</Button>
      </div>
    </form>
  );
}
