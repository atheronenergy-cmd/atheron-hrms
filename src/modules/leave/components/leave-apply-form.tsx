"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyLeaveAction } from "@/modules/leave/actions/leave.actions";

type LeaveTypeOption = { id: string; code: string; name: string };

export function LeaveApplyForm({ leaveTypes }: { leaveTypes: LeaveTypeOption[] }) {
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await applyLeaveAction({
        leaveTypeId: formData.get("leaveTypeId"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        halfDayType: formData.get("halfDayType") || "none",
        leaveUnit: "days",
        reason: formData.get("reason"),
        submit: true,
      });
      alert(result.message);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="leaveTypeId">Leave Type</Label>
        <select id="leaveTypeId" name="leaveTypeId" required className="w-full rounded-md border px-3 py-2 text-sm">
          <option value="">Select leave type</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="halfDayType">Half Day</Label>
        <select id="halfDayType" name="halfDayType" className="w-full rounded-md border px-3 py-2 text-sm">
          <option value="none">Full Day</option>
          <option value="first_half">First Half</option>
          <option value="second_half">Second Half</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" name="reason" required rows={3} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Submitting..." : "Apply Leave"}</Button>
    </form>
  );
}
