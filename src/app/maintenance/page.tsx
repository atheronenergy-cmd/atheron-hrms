import { Construction } from "lucide-react";

export const metadata = { title: "Maintenance" };

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
        <Construction className="h-8 w-8 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold">Under Maintenance</h1>
      <p className="max-w-md text-muted-foreground">
        Atheron HRMS is currently undergoing scheduled maintenance. We will be back shortly.
      </p>
    </div>
  );
}
