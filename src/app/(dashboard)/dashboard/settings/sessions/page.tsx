import { requireAuth, requireSession } from "@/infrastructure/auth/server";
import { getUserSessions } from "@/infrastructure/auth/session.service";
import { SessionsManager } from "@/modules/auth/components/sessions-manager";

export const metadata = {
  title: "Sessions",
};

export default async function SessionsPage() {
  await requireAuth();
  const session = await requireSession();
  const sessions = await getUserSessions(session.user.id, session.sessionToken);

  return <SessionsManager sessions={sessions} />;
}
