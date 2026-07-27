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
import { updateCompanyAction } from "@/modules/organization/actions/organization.actions";
import type { CompanyProfile } from "@/modules/organization/domain/types";
import { ORG_ROUTES } from "@/modules/organization/domain/types";
import { type UpdateCompanyInput,updateCompanySchema } from "@/modules/organization/validation/schemas";

type CompanyFormProps = {
  company: CompanyProfile;
};

export function CompanyForm({ company }: CompanyFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch } = useForm<UpdateCompanyInput>({
    defaultValues: {
      id: company.id,
      version: company.version,
      name: company.name,
      legalName: company.legalName ?? "",
      slug: company.slug,
      companyCode: company.companyCode ?? "",
      registrationNumber: company.registrationNumber ?? "",
      gstNumber: company.gstNumber ?? "",
      panNumber: company.panNumber ?? "",
      cinNumber: company.cinNumber ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      website: company.website ?? "",
      countryCode: company.countryCode,
      state: company.state ?? "",
      city: company.city ?? "",
      pinCode: company.pinCode ?? "",
      currencyCode: company.currencyCode,
      timezone: company.timezone,
      dateFormat: company.dateFormat,
      fiscalYearStartMonth: company.fiscalYearStartMonth,
      payrollCycleDay: company.payrollCycleDay,
      status: company.status as UpdateCompanyInput["status"],
    },
  });

  function onSubmit(values: UpdateCompanyInput) {
    setError(null);
    const parsed = updateCompanySchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Validation failed");
      return;
    }
    startTransition(async () => {
      const result = await updateCompanyAction(parsed.data);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name *</Label>
          <Input id="name" {...register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="legalName">Legal Name</Label>
          <Input id="legalName" {...register("legalName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyCode">Company Code</Label>
          <Input id="companyCode" {...register("companyCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registrationNumber">Registration Number</Label>
          <Input id="registrationNumber" {...register("registrationNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gstNumber">GST Number</Label>
          <Input id="gstNumber" {...register("gstNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="panNumber">PAN Number</Label>
          <Input id="panNumber" {...register("panNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cinNumber">CIN Number</Label>
          <Input id="cinNumber" {...register("cinNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register("website")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pinCode">PIN Code</Label>
          <Input id="pinCode" {...register("pinCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency</Label>
          <Input id="currencyCode" maxLength={3} {...register("currencyCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" {...register("timezone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Input id="dateFormat" {...register("dateFormat")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payrollCycleDay">Payroll Cycle Day</Label>
          <Input
            id="payrollCycleDay"
            type="number"
            min={1}
            max={31}
            {...register("payrollCycleDay", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v as UpdateCompanyInput["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" {...register("remarks")} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save profile"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(ORG_ROUTES.dashboard)}>Cancel</Button>
      </div>
    </form>
  );
}
