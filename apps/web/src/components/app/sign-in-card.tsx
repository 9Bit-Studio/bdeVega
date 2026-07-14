"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { useState, type FormEvent } from "react";

const inputClass =
  "mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

export function SignInCard() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email: email.trim(), password, name: name.trim(), flow });
    } catch {
      setError(
        flow === "signIn"
          ? "Wrong email or password — or no account yet. Try creating one."
          : "Could not create the account. Use at least 8 characters for the password.",
      );
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
        className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-7 shadow-2xl shadow-primary/10 backdrop-blur-md"
      >
        <span className="mb-5 grid size-12 place-items-center rounded-2xl gradient-warm text-primary-foreground">
          <Gamepad2 className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {flow === "signIn" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {flow === "signIn" ? "Sign in to keep building your games." : "One minute, then straight into the forge."}
        </p>

        {flow === "signUp" ? (
          <label className="mt-6 block text-xs font-medium text-muted-foreground">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus data-testid="app-signin-name" className={inputClass} />
          </label>
        ) : null}
        <label className={`${flow === "signUp" ? "mt-4" : "mt-6"} block text-xs font-medium text-muted-foreground`}>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus={flow === "signIn"} data-testid="app-signin-email" className={inputClass} />
        </label>
        <label className="mt-4 block text-xs font-medium text-muted-foreground">
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={flow === "signIn" ? "current-password" : "new-password"} data-testid="app-signin-password" className={inputClass} />
        </label>

        {error ? <p className="mt-3 text-xs text-primary">{error}</p> : null}

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.96 }}
          data-testid="app-signin-submit"
          className="card-lift mt-6 h-11 w-full rounded-xl gradient-warm font-display text-base font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "One sec…" : flow === "signIn" ? "Sign in" : "Create account"}
        </motion.button>

        <button
          type="button"
          onClick={() => {
            setFlow((value) => (value === "signIn" ? "signUp" : "signIn"));
            setError(null);
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {flow === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </motion.form>
    </main>
  );
}
