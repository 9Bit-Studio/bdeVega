"use client";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "vega.session";

interface StoredSession {
  userId: Id<"users">;
  name: string;
  email: string;
}

interface SessionContextValue {
  session: StoredSession | null;
  ready: boolean;
  signIn: (name: string, email: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const ensureUser = useMutation(api.localUsers.ensure);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as StoredSession);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (name: string, email: string) => {
    const userId = await ensureUser({ name, email });
    const value = { userId, name, email };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    setSession(value);
  }, [ensureUser]);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, ready, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
