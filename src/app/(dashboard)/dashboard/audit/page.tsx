import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAuth } from "@/infrastructure/auth/server";
import { guardPagePermission } from "@/infrastructure/authorization/server/guards";
import { auditService } from "@/modules/security/application/audit.service";
import { PERMISSIONS } from "@/shared/permissions/definitions";

export const metadata = { title: "Audit Logs" };

export default async function AuditPage() {
  await guardPagePermission(PERMISSIONS.AUDIT.LOG.READ);
  const user = await requireAuth();
  const { items } = await auditService.list({
    companyId: user.companyId ?? undefined,
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Compliance trail for sensitive operations" />

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No audit entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium capitalize">{entry.action}</TableCell>
                    <TableCell>
                      {entry.entityType}
                      {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}…` : ""}
                    </TableCell>
                    <TableCell>
                      {entry.user ? (
                        <span className="text-sm">
                          {entry.user.name}
                          <span className="block text-muted-foreground text-xs">{entry.user.email}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.ipAddress ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
