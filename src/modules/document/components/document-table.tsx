"use client";

import { format } from "date-fns";
import { Download, Eye, MoreHorizontal, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useMemo, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { PermissionButton } from "@/components/permissions/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteDocumentAction,
  downloadDocumentAction,
  verifyDocumentAction,
} from "@/modules/document/actions/document.actions";
import type { DocumentListItem } from "@/modules/document/domain/types";
import { VERIFICATION_STATUS_LABELS } from "@/shared/constants/files";
import { PERMISSIONS } from "@/shared/permissions/definitions";
import { formatFileSize } from "@/shared/utils/file.utils";

type DocumentTableProps = {
  documents: DocumentListItem[];
  onRefresh?: () => void;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_verification: "outline",
  verified: "default",
  rejected: "destructive",
  expired: "secondary",
  archived: "secondary",
};

export function DocumentTable({ documents, onRefresh }: DocumentTableProps) {
  const [, startTransition] = useTransition();

  const columns = useMemo<ColumnDef<DocumentListItem>[]>(
    () => [
      { accessorKey: "title", header: "Document Name" },
      { accessorKey: "categoryName", header: "Category", cell: ({ row }) => row.original.categoryName ?? "—" },
      { accessorKey: "documentTypeLabel", header: "Type" },
      {
        accessorKey: "uploadedAt",
        header: "Uploaded",
        cell: ({ row }) => format(new Date(row.original.uploadedAt), "dd MMM yyyy"),
      },
      {
        accessorKey: "expiryDate",
        header: "Expiry",
        cell: ({ row }) => row.original.expiryDate ? format(new Date(row.original.expiryDate), "dd MMM yyyy") : "—",
      },
      {
        accessorKey: "verificationStatus",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.verificationStatus] ?? "secondary"}>
            {VERIFICATION_STATUS_LABELS[row.original.verificationStatus] ?? row.original.verificationStatus}
          </Badge>
        ),
      },
      {
        accessorKey: "fileSize",
        header: "Size",
        cell: ({ row }) => formatFileSize(row.original.fileSize),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  startTransition(async () => {
                    const r = await downloadDocumentAction(row.original.id);
                    if (r.success && r.data) {
                      const blob = Uint8Array.from(atob(r.data.base64), (c) => c.charCodeAt(0));
                      const url = URL.createObjectURL(new Blob([blob], { type: r.data.mimeType }));
                      window.open(url, "_blank");
                      toast.success("Preview opened");
                      onRefresh?.();
                    } else toast.error(r.message);
                  });
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  startTransition(async () => {
                    const r = await downloadDocumentAction(row.original.id);
                    if (r.success && r.data) {
                      const blob = Uint8Array.from(atob(r.data.base64), (c) => c.charCodeAt(0));
                      const url = URL.createObjectURL(new Blob([blob], { type: r.data.mimeType }));
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = r.data.fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Download started");
                    } else toast.error(r.message);
                  });
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Download
              </DropdownMenuItem>
              {row.original.verificationStatus === "pending_verification" && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      startTransition(async () => {
                        const r = await verifyDocumentAction({ id: row.original.id, version: row.original.version, status: "verified" });
                        if (r.success) { toast.success(r.message); onRefresh?.(); } else toast.error(r.message);
                      });
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Verify
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      startTransition(async () => {
                        const r = await verifyDocumentAction({ id: row.original.id, version: row.original.version, status: "rejected" });
                        if (r.success) { toast.success(r.message); onRefresh?.(); } else toast.error(r.message);
                      });
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  startTransition(async () => {
                    const r = await deleteDocumentAction(row.original.id, row.original.version);
                    if (r.success) { toast.success(r.message); onRefresh?.(); } else toast.error(r.message);
                  });
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onRefresh],
  );

  return <DataTable columns={columns} data={documents} getRowId={(row) => row.id} />;
}
