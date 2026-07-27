import type { WorkflowRequestItem } from "@/modules/employee-lifecycle/domain/types";
import { LifecycleStatusBadge } from "@/modules/employee-lifecycle/components/lifecycle-status-badge";

export function ApprovalTimeline({ workflows }: { workflows: WorkflowRequestItem[] }) {
  if (workflows.length === 0) return null;

  return (
    <div className="space-y-3">
      {workflows.map((workflow) => (
        <div key={workflow.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{workflow.title}</p>
            <LifecycleStatusBadge status={workflow.status} />
          </div>
          <ol className="mt-3 space-y-2 border-s ps-4">
            {workflow.steps.map((step) => (
              <li key={step.id} className="text-sm">
                <span className="font-medium capitalize">{step.approverRole}</span>
                {" · "}
                <LifecycleStatusBadge status={step.status} />
                {step.comments ? <p className="text-muted-foreground">{step.comments}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
