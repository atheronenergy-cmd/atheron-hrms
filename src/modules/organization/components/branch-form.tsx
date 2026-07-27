"use client";

import { useRouter } from "next/navigation";
import { useState,useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBranchAction, updateBranchAction } from "@/modules/organization/actions/organization.actions";
import { ORG_ROUTES } from "@/modules/organization/domain/types";
import {
  type BranchInput,
  branchSchema,
  type UpdateBranchInput,
  updateBranchSchema,
} from "@/modules/organization/validation/schemas";

type BranchFormProps = {
  mode: "create" | "edit";
  defaultValues?: Partial<UpdateBranchInput> & { id?: string; version?: number };
};

export function BranchForm({ mode, defaultValues }: BranchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<BranchInput & { id?: string; version?: number }>({
    defaultValues: {
      name: "",
      code: "",
      isHeadOffice: false,
      status: "active",
      ...defaultValues,
    },
  });

  function onSubmit(values: BranchInput & { id?: string; version?: number }) {
    setError(null);
    const parsed =
      mode === "create" ? branchSchema.safeParse(values) : updateBranchSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createBranchAction(parsed.data)
          : await updateBranchAction(parsed.data);
      if (result.success) {
        toast.success(result.message);
        router.push(ORG_ROUTES.branches);
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
          <Label>Branch Name *</Label>
          <Input {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label>Branch Code *</Label>
          <Input {...register("code")} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...register("email")} />
        </div>
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input type="number" step="any" {...register("latitude", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input type="number" step="any" {...register("longitude", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Geo Radius (meters)</Label>
          <Input type="number" {...register("geofenceRadiusMeters", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-medium">GPS Attendance Settings</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={watch("gpsAttendanceEnabled")}
                onCheckedChange={(c) => setValue("gpsAttendanceEnabled", c === true)}
              />
              <Label>GPS attendance enabled</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={watch("allowOutsideLocation")}
                onCheckedChange={(c) => setValue("allowOutsideLocation", c === true)}
              />
              <Label>Allow outside location</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={watch("locationRequired")}
                onCheckedChange={(c) => setValue("locationRequired", c === true)}
              />
              <Label>Location required</Label>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as BranchInput["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={watch("isHeadOffice")}
          onCheckedChange={(c) => setValue("isHeadOffice", c === true)}
        />
        <Label>Head office</Label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : mode === "create" ? "Create Branch" : "Save Changes"}
      </Button>
    </form>
  );
}
