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
  createDepartmentAction,
  updateDepartmentAction,
} from "@/modules/organization/actions/organization.actions";
import { ORG_ROUTES } from "@/modules/organization/domain/types";
import {
  type DepartmentInput,
  departmentSchema,
  type UpdateDepartmentInput,
  updateDepartmentSchema,
} from "@/modules/organization/validation/schemas";

type BranchOption = { id: string; name: string };

type DepartmentFormProps = {
  mode: "create" | "edit";
  branches: BranchOption[];
  defaultValues?: Partial<UpdateDepartmentInput>;
};

export function DepartmentForm({ mode, branches, defaultValues }: DepartmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<DepartmentInput & UpdateDepartmentInput>({
    defaultValues: { name: "", code: "", status: "active", ...defaultValues },
  });

  function onSubmit(values: DepartmentInput & UpdateDepartmentInput) {
    setError(null);
    const parsed =
      mode === "create" ? departmentSchema.safeParse(values) : updateDepartmentSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createDepartmentAction(parsed.data)
          : await updateDepartmentAction(parsed.data);
      if (result.success) {
        toast.success(result.message);
        router.push(ORG_ROUTES.departments);
        router.refresh();
      } else {
        setError(result.message);
        toast.error(result.message);
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
          <Label>Department Name *</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input {...register("code")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Branch</Label>
          <Select
            value={watch("branchId") ?? "none"}
            onValueChange={(v) => setValue("branchId", v === "none" ? undefined : v)}
          >
            <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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
        {isPending ? "Saving…" : mode === "create" ? "Create Department" : "Save Changes"}
      </Button>
    </form>
  );
}
