"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadEmployeeDocumentAction } from "@/modules/document/actions/document.actions";
import { DocumentTable } from "@/modules/document/components/document-table";
import { EmployeePhotoUpload } from "@/modules/document/components/employee-photo-upload";
import { FileUpload } from "@/modules/document/components/file-upload";
import type { DocumentCategoryItem, DocumentListItem } from "@/modules/document/domain/types";
import {
  DOCUMENT_TYPE_LABELS,
  EDUCATION_DOCUMENT_TYPES,
  EMPLOYMENT_DOCUMENT_TYPES,
  IDENTITY_DOCUMENT_TYPES,
} from "@/shared/constants/files";

type EmployeeDocumentsPanelProps = {
  employeeId: string;
  photoUrl?: string | null;
  categories: DocumentCategoryItem[];
  documents: DocumentListItem[];
};

const SECTIONS = [
  { code: "identity", label: "Identity", types: IDENTITY_DOCUMENT_TYPES },
  { code: "employment", label: "Employment", types: EMPLOYMENT_DOCUMENT_TYPES },
  { code: "education", label: "Education", types: EDUCATION_DOCUMENT_TYPES },
  { code: "other", label: "Other Files", types: [] as string[] },
] as const;

export function EmployeeDocumentsPanel({
  employeeId,
  photoUrl,
  categories,
  documents,
}: EmployeeDocumentsPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState("identity");
  const [documentType, setDocumentType] = useState("");
  const [title, setTitle] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  const filteredDocuments = useMemo(() => {
    if (activeSection === "other") {
      return documents.filter((d) => !["identity", "employment", "education"].includes(d.categoryCode ?? ""));
    }
    return documents.filter((d) => d.categoryCode === activeSection);
  }, [activeSection, documents]);

  const sectionTypes = SECTIONS.find((s) => s.code === activeSection)?.types ?? [];

  async function handleUpload(files: File[]) {
    const file = files[0];
    if (!file || !documentType || !title) throw new Error("Document type and title are required");

    const formData = new FormData();
    formData.set("employeeId", employeeId);
    formData.set("categoryCode", activeSection);
    formData.set("documentType", documentType);
    formData.set("title", title);
    formData.set("file", file);
    if (expiryDate) formData.set("expiryDate", expiryDate);
    if (documentNumber) formData.set("documentNumber", documentNumber);

    const result = await uploadEmployeeDocumentAction(formData);
    if (!result.success) throw new Error(result.message);
    setTitle("");
    setDocumentType("");
    setExpiryDate("");
    setDocumentNumber("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      <EmployeePhotoUpload employeeId={employeeId} photoUrl={photoUrl} />

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex flex-wrap h-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.code} value={s.code}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((section) => (
          <TabsContent key={section.code} value={section.code} className="space-y-4 pt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Upload {section.label} Document</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {(section.types.length ? section.types : Object.keys(DOCUMENT_TYPE_LABELS)).map((t) => (
                        <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t] ?? t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
                </div>
                <div className="space-y-2">
                  <Label>Document Number</Label>
                  <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FileUpload onUpload={handleUpload} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">{section.label} Documents</CardTitle></CardHeader>
              <CardContent>
                <DocumentTable
                  documents={filteredDocuments}
                  onRefresh={() => startTransition(() => router.refresh())}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
