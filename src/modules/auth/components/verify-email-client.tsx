"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { verifyEmailAction } from "@/modules/auth/actions/auth.actions";
import { AUTH_ROUTES } from "@/shared/constants/auth";

type VerifyEmailClientProps = {
  token: string;
};

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function verify() {
      const result = await verifyEmailAction({ token });
      if (!active) return;
      setStatus(result.success ? "success" : "error");
      setMessage(result.message);
    }

    void verify();
    return () => {
      active = false;
    };
  }, [token]);

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant={status === "success" ? "success" : "destructive"}>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button asChild className="w-full">
        <Link href={AUTH_ROUTES.login}>Continue to sign in</Link>
      </Button>
    </div>
  );
}
