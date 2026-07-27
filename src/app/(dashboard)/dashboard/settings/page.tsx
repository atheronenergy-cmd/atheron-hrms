import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuth } from "@/infrastructure/auth/server";

export const metadata = { title: "Settings" };

const settingsLinks = [
  {
    title: "Security policy",
    description: "Password rules, session limits, and login protection",
    href: "/dashboard/settings/security",
  },
  {
    title: "Two-factor authentication",
    description: "Set up authenticator app and backup codes",
    href: "/dashboard/settings/two-factor",
  },
  {
    title: "Active sessions",
    description: "View and revoke signed-in devices",
    href: "/dashboard/settings/sessions",
  },
  {
    title: "Trusted devices",
    description: "Manage devices that access your account",
    href: "/dashboard/settings/devices",
  },
];

export default async function SettingsPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure account and security preferences" />
      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
