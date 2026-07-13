"use client";

import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useSession } from "@/components/app/session-provider";

export function SignInCard() {
  const { signIn } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(name.trim(), email.trim());
    } catch {
      setError("Could not start a session. Is the local backend running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-7"
      >
        <span className="mb-5 grid size-12 place-items-center rounded-2xl gradient-warm text-primary-foreground">
          <Gamepad2 className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight">Welcome to Vega Forge</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Pick a name and you&apos;re in — everything runs locally.</p>

        <label className="mt-6 block text-xs font-medium text-muted-foreground">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            data-testid="app-signin-name"
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </label>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            data-testid="app-signin-email"
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
          />
        </label>

        {error ? <p className="mt-3 text-xs text-primary">{error}</p> : null}

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.96 }}
          data-testid="app-signin-submit"
          className="mt-6 h-11 w-full rounded-xl gradient-warm font-display text-base font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Starting…" : "Start playing"}
        </motion.button>
      </motion.form>
    </main>
  );
}
