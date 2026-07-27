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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmployeeAction,
  updateEmployeeAction,
} from "@/modules/employee/actions/employee.actions";
import {
  EMPLOYEE_ROUTES,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
} from "@/modules/employee/domain/types";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/modules/employee/validation/schemas";

type Option = { id: string; name: string };

type EmployeeFormProps = {
  mode: "create" | "edit";
  branches: Option[];
  departments: Option[];
  designations: Option[];
  managers: Option[];
  defaultValues?: Record<string, unknown>;
};

export function EmployeeForm({
  mode,
  branches,
  departments,
  designations,
  managers,
  defaultValues,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<CreateEmployeeInput & UpdateEmployeeInput>({
    defaultValues: {
      autoGenerateCode: true,
      employmentType: "permanent",
      employmentStatus: "active",
      ...defaultValues,
    },
  });

  function onSubmit(values: CreateEmployeeInput & UpdateEmployeeInput) {
    setError(null);
    const parsed =
      mode === "create" ? createEmployeeSchema.safeParse(values) : updateEmployeeSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createEmployeeAction(parsed.data)
          : await updateEmployeeAction(parsed.data);
      if (result.success) {
        toast.success(result.message);
        router.push(
          mode === "create" && result.data?.id
            ? EMPLOYEE_ROUTES.detail(result.data.id)
            : EMPLOYEE_ROUTES.list,
        );
        router.refresh();
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mode === "edit" && (
        <>
          <input type="hidden" {...register("id")} />
          <input type="hidden" {...register("version", { valueAsNumber: true })} />
        </>
      )}

      <Tabs defaultValue="employment">
        <TabsList>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
        </TabsList>

        <TabsContent value="employment" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Branch *</Label>
              <Select value={watch("branchId") ?? ""} onValueChange={(v) => setValue("branchId", v)}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={watch("departmentId") ?? ""} onValueChange={(v) => setValue("departmentId", v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation *</Label>
              <Select value={watch("designationId") ?? ""} onValueChange={(v) => setValue("designationId", v)}>
                <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>
                  {designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reporting Manager</Label>
              <Select
                value={watch("reportingManagerId") ?? "none"}
                onValueChange={(v) => setValue("reportingManagerId", v === "none" ? undefined : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Joining Date *</Label>
              <Input type="date" {...register("dateOfJoining")} />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select
                value={watch("employmentType")}
                onValueChange={(v) => setValue("employmentType", v as CreateEmployeeInput["employmentType"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select
                value={watch("employmentStatus")}
                onValueChange={(v) => setValue("employmentStatus", v as CreateEmployeeInput["employmentStatus"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work Location</Label>
              <Input {...register("workLocation")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>First Name *</Label><Input {...register("firstName")} /></div>
            <div className="space-y-2"><Label>Last Name *</Label><Input {...register("lastName")} /></div>
            <div className="space-y-2"><Label>Middle Name</Label><Input {...register("middleName")} /></div>
            <div className="space-y-2"><Label>Preferred Name</Label><Input {...register("preferredName")} /></div>
            <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" {...register("dateOfBirth")} /></div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={watch("gender") ?? "none"}
                onValueChange={(v) => setValue("gender", v === "none" ? undefined : (v as CreateEmployeeInput["gender"]))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {Object.entries(GENDER_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Blood Group</Label><Input {...register("bloodGroup")} /></div>
            <div className="space-y-2"><Label>Nationality</Label><Input {...register("nationality")} /></div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Company Email *</Label><Input type="email" {...register("email")} /></div>
            <div className="space-y-2"><Label>Personal Email</Label><Input type="email" {...register("personalEmail")} /></div>
            <div className="space-y-2"><Label>Primary Mobile</Label><Input {...register("phone")} /></div>
            <div className="space-y-2"><Label>Alternate Mobile</Label><Input {...register("alternatePhone")} /></div>
          </div>
        </TabsContent>

        <TabsContent value="identity" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">Sensitive fields are encrypted at rest and masked in the UI.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Aadhaar</Label><Input {...register("identityDocuments.aadhaar")} /></div>
            <div className="space-y-2"><Label>PAN</Label><Input {...register("identityDocuments.pan")} /></div>
            <div className="space-y-2"><Label>UAN</Label><Input {...register("identityDocuments.uan")} /></div>
            <div className="space-y-2"><Label>ESIC Number</Label><Input {...register("identityDocuments.esicNumber")} /></div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label>Remarks</Label>
        <Textarea {...register("remarks")} />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : mode === "create" ? "Create Employee" : "Save Changes"}
      </Button>
    </form>
  );
}
