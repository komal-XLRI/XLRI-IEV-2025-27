import { requirePageSession } from "@/lib/auth";
import { Shell } from "@/components/layout/shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  return (
    <Shell user={{ name: session.name, email: session.email, role: session.role }}>
      {children}
    </Shell>
  );
}
