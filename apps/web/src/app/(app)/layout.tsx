import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { SessionProvider } from "@/components/app/session-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
