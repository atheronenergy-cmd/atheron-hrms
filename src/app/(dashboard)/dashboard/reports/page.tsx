import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate and export HR reports" />
      <EmptyState title="Reports module coming soon" description="Will be implemented in Phase 6." />
    </div>
  );
}
