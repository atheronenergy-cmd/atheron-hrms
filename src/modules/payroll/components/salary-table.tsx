import { Badge } from "@/components/ui/badge";
import type { EmployeeSalaryListItem, SalaryComponentListItem, SalaryRevisionListItem, SalaryStructureListItem } from "@/modules/payroll/domain/types";

export function SalaryStructureTable({ items }: { items: SalaryStructureListItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No salary structures found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Grade</th><th className="py-2 pr-4">Components</th><th className="py-2 pr-4">CTC</th><th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4 font-mono">{item.code}</td>
              <td className="py-2 pr-4">{item.name}</td>
              <td className="py-2 pr-4">{item.payGradeName ?? "—"}</td>
              <td className="py-2 pr-4">{item.componentCount}</td>
              <td className="py-2 pr-4">{item.monthlyCtcDefault ?? "—"}</td>
              <td className="py-2 pr-4"><Badge variant="outline">{item.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalaryComponentTable({ items }: { items: SalaryComponentListItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No components found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Structure</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Calc</th><th className="py-2 pr-4">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4 font-mono">{item.code}</td>
              <td className="py-2 pr-4">{item.name}</td>
              <td className="py-2 pr-4">{item.structureName}</td>
              <td className="py-2 pr-4">{item.componentType}</td>
              <td className="py-2 pr-4">{item.calculationType}</td>
              <td className="py-2 pr-4">{item.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeSalaryTable({ items }: { items: EmployeeSalaryListItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No employee salary assignments found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Employee</th><th className="py-2 pr-4">Structure</th><th className="py-2 pr-4">Base</th><th className="py-2 pr-4">Monthly CTC</th><th className="py-2 pr-4">Effective</th><th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4"><div className="font-medium">{item.employeeName}</div><div className="text-xs text-muted-foreground">{item.employeeCode}</div></td>
              <td className="py-2 pr-4">{item.structureName}</td>
              <td className="py-2 pr-4">{item.baseSalary}</td>
              <td className="py-2 pr-4">{item.monthlyCtc}</td>
              <td className="py-2 pr-4">{item.effectiveFrom}</td>
              <td className="py-2 pr-4"><Badge variant="outline">{item.approvalStatus}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SalaryRevisionTable({ items }: { items: SalaryRevisionListItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No salary revisions found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Employee</th><th className="py-2 pr-4">Previous</th><th className="py-2 pr-4">New</th><th className="py-2 pr-4">Effective</th><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2 pr-4">{item.employeeName}</td>
              <td className="py-2 pr-4">{item.previousSalary}</td>
              <td className="py-2 pr-4">{item.newSalary}</td>
              <td className="py-2 pr-4">{item.effectiveDate}</td>
              <td className="py-2 pr-4">{item.reason ?? "—"}</td>
              <td className="py-2 pr-4"><Badge variant="outline">{item.approvalStatus}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
