/**
 * Repository barrel — placeholder exports for modules without full implementation yet.
 * Full repositories added incrementally per module phase.
 */
export type RepositoryPlaceholder = {
  module: string;
  status: "placeholder";
};

export const PLACEHOLDER_REPOSITORIES: RepositoryPlaceholder[] = [
  { module: "attendance", status: "placeholder" },
  { module: "leave", status: "placeholder" },
  { module: "payroll", status: "placeholder" },
  { module: "asset", status: "placeholder" },
  { module: "expense", status: "placeholder" },
  { module: "recruitment", status: "placeholder" },
  { module: "training", status: "placeholder" },
  { module: "performance", status: "placeholder" },
  { module: "notification", status: "placeholder" },
  { module: "audit", status: "placeholder" },
  { module: "document", status: "placeholder" },
];
