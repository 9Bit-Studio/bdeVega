"use client";

import { motion } from "framer-motion";
import { Activity, Compass, Gamepad2, Home, LibraryBig, LogOut, Plus, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { useSession } from "@/components/app/session-provider";
import { SignInCard } from "@/components/app/sign-in-card";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/games", label: "My Games", icon: LibraryBig },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/operations", label: "Generation Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

const springPress = { whileTap: { scale: 0.95 }, transition: { type: "spring" as const, stiffness: 500, damping: 24 } };

export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const pathname = usePathname();

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }
  if (!session) {
    return <SignInCard />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <TopBar />
        <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/60 px-3 py-5 md:flex">
      <Link href="/home" className="mb-8 flex items-center gap-2.5 rounded-xl px-3 py-1 font-display text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid size-9 place-items-center rounded-xl gradient-warm text-primary-foreground">
          <Gamepad2 className="size-5" />
        </span>
        Vega Forge
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4.5" /> {label}
            </Link>
          );
        })}
      </nav>

      <motion.div {...springPress} className="mt-auto">
        <Link
          href="/create"
          className="glow-pulse flex w-full items-center justify-center gap-2 rounded-2xl gradient-warm px-4 py-3.5 font-display text-base font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="size-5" strokeWidth={3} /> Create Game
        </Link>
      </motion.div>
    </aside>
  );
}

function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    router.push(query.trim() ? `/games?q=${encodeURIComponent(query.trim())}` : "/games");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <form onSubmit={submit} role="search" className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your games…"
          aria-label="Search your games"
          className="h-9 w-full rounded-full border border-border bg-muted/60 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </form>
      <div className="ml-auto">
        <AvatarMenu />
      </div>
    </header>
  );
}

function AvatarMenu() {
  const { session, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const initials = (session?.name ?? "?").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid size-9 place-items-center rounded-full gradient-warm text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {initials}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-11 w-56 rounded-xl border border-border bg-card p-2 shadow-2xl shadow-black/50">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{session?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  const tabs = [NAV_ITEMS[0], NAV_ITEMS[1], null, NAV_ITEMS[2], NAV_ITEMS[4]];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {tabs.map((tab, index) =>
        tab ? (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname.startsWith(tab.href) ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              pathname.startsWith(tab.href) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="size-5" /> {tab.label}
          </Link>
        ) : (
          <Link
            key={`create-${index}`}
            href="/create"
            aria-label="Create Game"
            className="flex items-center justify-center focus-visible:outline-none"
          >
            <span className="glow-pulse grid size-11 -translate-y-3 place-items-center rounded-2xl gradient-warm text-primary-foreground ring-4 ring-background">
              <Plus className="size-6" strokeWidth={3} />
            </span>
          </Link>
        ),
      )}
    </nav>
  );
}
