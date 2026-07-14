"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { createContext, useContext, type ReactNode } from "react";

interface Session {
  userId: Id<"users">;
  name: string;
  email: string;
}

interface SessionContextValue {
  session: Session | null;
  ready: boolean;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");

  const session: Session | null =
    isAuthenticated && user ? { userId: user._id, name: user.name, email: user.email } : null;
  const ready = !isLoading && (!isAuthenticated || user !== undefined);

  return (
    <SessionContext.Provider value={{ session, ready, signOut: () => void signOut() }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
