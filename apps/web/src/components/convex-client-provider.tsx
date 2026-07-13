"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo, type PropsWithChildren } from "react";

export function ConvexClientProvider({ children }: PropsWithChildren) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210";
  const client = useMemo(() => new ConvexReactClient(url), [url]);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
