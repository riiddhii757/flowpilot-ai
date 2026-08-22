import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
export default async function SettingsLayout({ children }: { children: React.ReactNode }) { const user = await getCurrentUser(); const member = user?.members[0]; return <AppShell user={user ? { name: user.name, email: user.email } : undefined} organization={member ? { name: member.organization.name, role: member.role } : undefined}>{children}</AppShell>; }
