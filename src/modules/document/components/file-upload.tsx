"use client";

import { FileIcon, Upload, X } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/shared/utils/file.utils";

type FileUploadProps = {
  accept?: string;
  maxSizeMb?: number;
  multiple?: boolean;
  disabled?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  className?: string;
};

export function FileUpload({
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  maxSizeMb = 10,
  multiple = false,
  disabled = false,
  onUpload,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();

  const validateFiles = useCallback(
    (files: File[]) => {
      const maxBytes = maxSizeMb * 1024 * 1024;
      for (const file of files) {
        if (file.size > maxBytes) {
          throw new Error(`${file.name} exceeds ${maxSizeMb}MB limit`);
        }
      }
      return files;
    },
    [maxSizeMb],
  );

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    try {
      const files = validateFiles(Array.from(fileList));
      setSelected(multiple ? files : [files[0]!]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid file");
    }
  }

  function handleUpload() {
    if (selected.length === 0) return;
    startTransition(async () => {
      setProgress(20);
      try {
        await onUpload(selected);
        setProgress(100);
        setSelected([]);
        toast.success("Upload complete");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setProgress(0);
      }
    });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 pointer-events-none",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drag & drop files here</p>
        <p className="text-xs text-muted-foreground mt-1">Max {maxSizeMb}MB · PDF, JPG, PNG, WEBP</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((file) => (
            <div key={file.name} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelected([])}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {isPending && (
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress || 30}%` }} />
            </div>
          )}
          <Button type="button" onClick={handleUpload} disabled={isPending}>
            {isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      )}
    </div>
  );
}
