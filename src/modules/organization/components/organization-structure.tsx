"use client";

import { cn } from "@/lib/utils";
import { RecordStatusBadge } from "@/modules/organization/components/record-status-badge";
import type { OrgStructureNode } from "@/modules/organization/domain/types";

type OrganizationStructureProps = {
  tree: OrgStructureNode | null;
};

const typeLabels: Record<OrgStructureNode["type"], string> = {
  company: "Company",
  branch: "Branch",
  department: "Department",
  designation: "Designation",
};

function StructureNode({ node, depth = 0 }: { node: OrgStructureNode; depth?: number }) {
  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 border-l pl-4")}>
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {typeLabels[node.type]}
        </span>
        <span className="font-medium">{node.label}</span>
        {node.code && <span className="text-sm text-muted-foreground">({node.code})</span>}
        <RecordStatusBadge status={node.status} />
      </div>
      {node.children?.map((child) => (
        <StructureNode key={`${child.type}-${child.id}`} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function OrganizationStructure({ tree }: OrganizationStructureProps) {
  if (!tree) {
    return <p className="text-sm text-muted-foreground">Organization structure unavailable.</p>;
  }
  return <StructureNode node={tree} />;
}
