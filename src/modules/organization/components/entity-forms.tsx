"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createDesignationAction,
  createHolidayAction,
  createPolicyAction,
  createScheduleAction,
  updateCompanySettingsAction,
  updateDesignationAction,
  updateHolidayAction,
  updatePolicyAction,
  updateScheduleAction,
} from "@/modules/organization/actions/organization.actions";
import type { CompanySettingsData } from "@/modules/organization/domain/types";
import { HR_POLICY_CATEGORY_LABELS, ORG_ROUTES } from "@/modules/organization/domain/types";
import {
  type CompanySettingsInput,
  companySettingsSchema,
  createDesignationSchema,
  createHolidaySchema,
  createPolicySchema,
  createWorkingScheduleSchema,
  type DesignationInput,
  type HolidayInput,
  type PolicyInput,
  type UpdateDesignationInput,
  updateDesignationSchema,
  type UpdateHolidayInput,
  updateHolidaySchema,
  type UpdatePolicyInput,
  updatePolicySchema,
  type UpdateWorkingScheduleInput,
  updateWorkingScheduleSchema,
  type WorkingScheduleInput,
} from "@/modules/organization/validation/schemas";

type DeptOption = { id: string; name: string };
type BranchOption = { id: string; name: string };

export function DesignationForm({
  mode,
  departments,
  defaultValues,
}: {
  mode: "create" | "edit";
  departments: DeptOption[];
  defaultValues?: Partial<UpdateDesignationInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<DesignationInput & UpdateDesignationInput>({
    defaultValues: { name: "", code: "", level: 1, status: "active", ...defaultValues },
  });

  function onSubmit(values: DesignationInput & UpdateDesignationInput) {
    setError(null);
    const parsed =
      mode === "create" ? createDesignationSchema.safeParse(values) : updateDesignationSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    startTransition(async () => {
      const r =
        mode === "create"
          ? await createDesignationAction(parsed.data)
          : await updateDesignationAction(parsed.data);
      if (r.success) {
        toast.success(r.message);
        router.push(ORG_ROUTES.designations);
        router.refresh();
      } else {
        setError(r.message);
        toast.error(r.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mode === "edit" && (
        <>
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("version", { valueAsNumber: true })} />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input {...register("code")} />
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Input type="number" {...register("level", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={watch("departmentId") ?? "none"}
            onValueChange={(v) => setValue("departmentId", v === "none" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function HolidayForm({
  mode,
  branches,
  defaultValues,
}: {
  mode: "create" | "edit";
  branches: BranchOption[];
  defaultValues?: Partial<UpdateHolidayInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<HolidayInput & UpdateHolidayInput>({
    defaultValues: {
      name: "",
      holidayType: "public",
      status: "active",
      applicableDepartmentIds: [],
      ...defaultValues,
    },
  });

  function onSubmit(values: HolidayInput & UpdateHolidayInput) {
    setError(null);
    const parsed =
      mode === "create" ? createHolidaySchema.safeParse(values) : updateHolidaySchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    startTransition(async () => {
      const r =
        mode === "create" ? await createHolidayAction(parsed.data) : await updateHolidayAction(parsed.data);
      if (r.success) {
        toast.success(r.message);
        router.push(ORG_ROUTES.holidays);
        router.refresh();
      } else {
        setError(r.message);
        toast.error(r.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mode === "edit" && (
        <>
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("version", { valueAsNumber: true })} />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Holiday Name *</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" {...register("date")} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={watch("holidayType")}
            onValueChange={(v) => setValue("holidayType", v as HolidayInput["holidayType"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="optional">Optional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select
            value={watch("branchId") ?? "none"}
            onValueChange={(v) => setValue("branchId", v === "none" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function PolicyForm({
  mode,
  defaultValues,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<UpdatePolicyInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<PolicyInput & UpdatePolicyInput>({
    defaultValues: { category: "attendance", name: "", code: "", rules: {}, status: "active", ...defaultValues },
  });

  function onSubmit(values: PolicyInput & UpdatePolicyInput) {
    setError(null);
    const parsed =
      mode === "create" ? createPolicySchema.safeParse(values) : updatePolicySchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    startTransition(async () => {
      const r =
        mode === "create" ? await createPolicyAction(parsed.data) : await updatePolicyAction(parsed.data);
      if (r.success) {
        toast.success(r.message);
        router.push(ORG_ROUTES.policies);
        router.refresh();
      } else {
        setError(r.message);
        toast.error(r.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mode === "edit" && (
        <>
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("version", { valueAsNumber: true })} />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input {...register("code")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Category</Label>
          <Select
            value={watch("category")}
            onValueChange={(v) => setValue("category", v as PolicyInput["category"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(HR_POLICY_CATEGORY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea {...register("description")} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function ScheduleForm({
  mode,
  defaultValues,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<UpdateWorkingScheduleInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<WorkingScheduleInput & UpdateWorkingScheduleInput>({
    defaultValues: {
      name: "",
      code: "",
      startTime: "09:00",
      endTime: "18:00",
      breakDurationMinutes: 60,
      workingDays: [1, 2, 3, 4, 5],
      status: "active",
      ...defaultValues,
    },
  });

  function onSubmit(values: WorkingScheduleInput & UpdateWorkingScheduleInput) {
    setError(null);
    const parsed =
      mode === "create"
        ? createWorkingScheduleSchema.safeParse(values)
        : updateWorkingScheduleSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    startTransition(async () => {
      const r =
        mode === "create" ? await createScheduleAction(parsed.data) : await updateScheduleAction(parsed.data);
      if (r.success) {
        toast.success(r.message);
        router.push(ORG_ROUTES.schedules);
        router.refresh();
      } else {
        setError(r.message);
        toast.error(r.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mode === "edit" && (
        <>
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("version", { valueAsNumber: true })} />
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input {...register("code")} />
        </div>
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Input type="time" {...register("startTime")} />
        </div>
        <div className="space-y-2">
          <Label>End Time</Label>
          <Input type="time" {...register("endTime")} />
        </div>
        <div className="space-y-2">
          <Label>Break (minutes)</Label>
          <Input type="number" {...register("breakDurationMinutes", { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function CompanySettingsForm({ settings }: { settings: CompanySettingsData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<CompanySettingsInput>({
    defaultValues: settings,
  });

  function onSubmit(values: CompanySettingsInput) {
    setError(null);
    const parsed = companySettingsSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    startTransition(async () => {
      const r = await updateCompanySettingsAction(parsed.data);
      if (r.success) toast.success(r.message);
      else {
        setError(r.message);
        toast.error(r.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Default Currency</Label>
          <Input maxLength={3} {...register("defaultCurrency")} />
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Input {...register("timezone")} />
        </div>
        <div className="space-y-2">
          <Label>Payroll Date</Label>
          <Input type="number" min={1} max={31} {...register("payrollDate", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Date Format</Label>
          <Input {...register("dateFormat")} />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save Settings"}
      </Button>
    </form>
  );
}
