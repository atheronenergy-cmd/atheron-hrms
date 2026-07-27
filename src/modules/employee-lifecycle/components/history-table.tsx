import { Input } from "@/components/ui/input";

type HistoryTableProps<T extends { id: string }> = {
  title: string;
  items: T[];
  columns: Array<{ key: keyof T | string; header: string; render?: (item: T) => string }>;
  search?: string;
  onSearchChange?: (value: string) => void;
  emptyMessage?: string;
};

export function HistoryTable<T extends { id: string }>({
  title,
  items,
  columns,
  search,
  onSearchChange,
  emptyMessage = "No records found.",
}: HistoryTableProps<T>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {onSearchChange ? (
          <Input placeholder="Search…" value={search ?? ""} onChange={(e) => onSearchChange(e.target.value)} className="max-w-xs" />
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className="px-3 py-2 text-left font-medium">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">{emptyMessage}</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-3 py-2">
                      {col.render ? col.render(item) : String(item[col.key as keyof T] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
