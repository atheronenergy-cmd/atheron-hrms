"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AUTH_ROUTES } from "@/shared/constants/auth";

type SessionExpiredDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SessionExpiredDialog({ open, onOpenChange }: SessionExpiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="session-expired-description">
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription id="session-expired-description">
            Your session has expired for security reasons. Please sign in again to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button asChild>
            <Link href={AUTH_ROUTES.login}>Sign in</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
