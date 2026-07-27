"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center font-sans">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">Application Error</h1>
        <p className="max-w-md text-sm text-gray-600">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </body>
    </html>
  );
}
