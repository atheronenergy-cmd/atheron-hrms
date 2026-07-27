"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { punchAttendanceAction } from "@/modules/attendance/actions/attendance.actions";

type PunchButtonProps = {
  employeeId: string;
  type: "in" | "out";
};

export function PunchButton({ employeeId, type }: PunchButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={async () => {
        const result = await punchAttendanceAction({ employeeId, punchType: type, method: "manual" });
        if (result.success) startTransition(() => router.refresh());
      }}
    >
      {type === "in" ? "Check In" : "Check Out"}
    </Button>
  );
}
