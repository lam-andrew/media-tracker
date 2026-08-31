import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <DashboardShell userEmail={user.email ?? ""}>{children}</DashboardShell>
  );
}
