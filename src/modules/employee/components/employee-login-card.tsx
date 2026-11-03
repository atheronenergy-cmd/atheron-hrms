"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { enableEmployeeLoginAction } from "@/modules/employee/actions/employee.actions";

export function EmployeeLoginCard({
  employeeId,
  email,
  linkedEmail,
  canManage,
}: {
  employeeId: string;
  email: string;
  linkedEmail: string | null;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [linked, setLinked] = useState(linkedEmail);

  function enable() {
    startTransition(async () => {
      const result = await enableEmployeeLoginAction(employeeId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setLinked(email);
      toast.success(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Employee login</CardTitle>
        <CardDescription>
          {linked
            ? `This person signs in as ${linked} and can mark their own attendance.`
            : "No login is linked yet, so this person cannot mark their own attendance."}
        </CardDescription>
      </CardHeader>
      {!linked && canManage && (
        <CardContent>
          <Button onClick={enable} disabled={isPending}>
            {isPending ? "Creating login…" : "Create login"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
