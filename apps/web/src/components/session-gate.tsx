import { SessionExpired } from "@/components/session-expired";
import { getCurrentUser } from "@/lib/auth";

export async function SessionGate() {
  const user = await getCurrentUser();

  return user ? null : <SessionExpired />;
}
