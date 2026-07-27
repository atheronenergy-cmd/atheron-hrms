"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestCorrectionAction } from "@/modules/attendance/actions/attendance.actions";

type CorrectionFormProps = {
  employeeId: string;
};

export function CorrectionForm({ employeeId }: CorrectionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const result = await requestCorrectionAction({
          employeeId,
          attendanceDate: String(fd.get("attendanceDate")),
          correctionType: String(fd.get("correctionType")) as "missed_punch",
          requestedCheckIn: String(fd.get("requestedCheckIn") ?? "") || undefined,
          requestedCheckOut: String(fd.get("requestedCheckOut") ?? "") || undefined,
          reason: String(fd.get("reason")),
        });
        if (result.success) startTransition(() => router.refresh());
      }}
    >
      <div><Label htmlFor="attendanceDate">Date</Label><Input id="attendanceDate" name="attendanceDate" type="date" required /></div>
      <div><Label htmlFor="correctionType">Type</Label><Input id="correctionType" name="correctionType" defaultValue="missed_punch" required /></div>
      <div><Label htmlFor="requestedCheckIn">Requested Check In</Label><Input id="requestedCheckIn" name="requestedCheckIn" type="datetime-local" /></div>
      <div><Label htmlFor="requestedCheckOut">Requested Check Out</Label><Input id="requestedCheckOut" name="requestedCheckOut" type="datetime-local" /></div>
      <div className="sm:col-span-2"><Label htmlFor="reason">Reason</Label><Input id="reason" name="reason" required /></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>Submit Correction</Button></div>
    </form>
  );
}
