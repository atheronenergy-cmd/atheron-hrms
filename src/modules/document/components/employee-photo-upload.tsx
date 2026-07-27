"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadEmployeePhotoAction } from "@/modules/document/actions/document.actions";
import { FileUpload } from "@/modules/document/components/file-upload";

type EmployeePhotoUploadProps = {
  employeeId: string;
  photoUrl?: string | null;
};

export function EmployeePhotoUpload({ employeeId, photoUrl }: EmployeePhotoUploadProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Profile Photo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="h-24 w-24 rounded-full bg-muted overflow-hidden flex items-center justify-center text-2xl font-semibold text-muted-foreground">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Employee" className="h-full w-full object-cover" />
          ) : (
            "?"
          )}
        </div>
        <div className="flex-1 w-full">
          <FileUpload
            maxSizeMb={2}
            accept="image/jpeg,image/png,image/webp"
            onUpload={async (files) => {
              const file = files[0];
              if (!file) return;
              const formData = new FormData();
              formData.set("employeeId", employeeId);
              formData.set("file", file);
              startTransition(async () => {
                const result = await uploadEmployeePhotoAction(formData);
                if (result.success && result.data) {
                  setPreview(result.data.url);
                  router.refresh();
                } else {
                  throw new Error(result.message);
                }
              });
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">Thumbnail & crop pipeline ready for future enhancement.</p>
        </div>
      </CardContent>
    </Card>
  );
}
