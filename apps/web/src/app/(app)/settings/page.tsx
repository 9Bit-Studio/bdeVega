"use client";

import { api } from "../../../../../../convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useSession } from "@/components/app/session-provider";

type Provider = "openai" | "anthropic" | "gemini";
type Tier = "fast" | "strong";

const PROVIDERS: { id: Provider; name: string; blurb: string }[] = [
  { id: "openai", name: "OpenAI", blurb: "GPT models" },
  { id: "anthropic", name: "Anthropic", blurb: "Claude models" },
  { id: "gemini", name: "Gemini", blurb: "Google models" },
];

export default function SettingsPage() {
  const { session } = useSession();
  const settings = useQuery(api.settings.get, session ? {} : "skip");
  const keys = useQuery(api.apiKeys.listMasked, session ? {} : "skip");
  const saveSettings = useMutation(api.settings.save);

  if (!session || !settings || keys === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="mt-8 grid gap-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="skeleton h-44 rounded-2xl" />)}</div>
      </div>
    );
  }

  const update = (patch: Partial<{ defaultProvider: Provider; modelTiers: Record<Provider, Tier> }>) =>
    saveSettings({
      defaultProvider: patch.defaultProvider ?? settings.defaultProvider,
      modelTiers: patch.modelTiers ?? settings.modelTiers,
    });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your AI setup lives here. Every build and refinement uses the default provider below — change it any time and it applies to your next build.
      </p>

      <div className="mt-8 grid gap-4">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            savedKey={keys.find((key) => key.provider === provider.id) ?? null}
            tier={settings.modelTiers[provider.id]}
            isDefault={settings.defaultProvider === provider.id}
            onTierChange={(tier) => update({ modelTiers: { ...settings.modelTiers, [provider.id]: tier } })}
            onMakeDefault={() => update({ defaultProvider: provider.id })}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ provider, savedKey, tier, isDefault, onTierChange, onMakeDefault }: {
  provider: { id: Provider; name: string; blurb: string };
  savedKey: { last4: string } | null;
  tier: Tier;
  isDefault: boolean;
  onTierChange: (tier: Tier) => void;
  onMakeDefault: () => void;
}) {
  const saveKey = useAction(api.apiKeys.save);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    const result = await saveKey({ provider: provider.id, key: draft.trim() }).catch(() => ({ ok: false as const, message: "Something went wrong saving the key" }));
    setBusy(false);
    if (result.ok) {
      setDraft("");
      setEditing(false);
    } else {
      setError(result.message ?? "That key didn’t validate");
    }
  };

  return (
    <motion.section
      layout
      className={`rounded-2xl border bg-card p-5 transition-colors ${isDefault ? "border-primary/60" : "border-border"}`}
      aria-label={`${provider.name} settings`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-muted text-accent"><KeyRound className="size-5" /></span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight">{provider.name}</h2>
          <p className="text-xs text-muted-foreground">{provider.blurb}</p>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="default-provider"
            checked={isDefault}
            onChange={onMakeDefault}
            className="size-4 accent-[var(--primary)]"
          />
          <span className={isDefault ? "font-semibold text-primary" : "text-muted-foreground"}>Default provider</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {savedKey && !editing ? (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-accent" /> Key saved
              <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">••••{savedKey.last4}</code>
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Replace key
            </button>
          </>
        ) : (
          <form onSubmit={submitKey} className="flex w-full flex-wrap items-center gap-2">
            <input
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Paste your ${provider.name} API key`}
              aria-label={`${provider.name} API key`}
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 font-mono text-sm outline-none transition-colors focus:border-primary"
            />
            <motion.button
              type="submit"
              disabled={busy || !draft.trim()}
              whileTap={{ scale: 0.96 }}
              className="flex h-10 items-center gap-2 rounded-xl gradient-warm px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {busy ? "Validating…" : "Save key"}
            </motion.button>
            {savedKey ? (
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); setDraft(""); }}
                className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
              >
                Cancel
              </button>
            ) : null}
          </form>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-primary" role="alert">{error}</p> : null}

      <div className="mt-5 flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Model</span>
        <div role="radiogroup" aria-label={`${provider.name} model tier`} className="flex rounded-full border border-border p-0.5">
          {(["fast", "strong"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={tier === option}
              onClick={() => onTierChange(option)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tier === option ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "fast" ? "Fast" : "Strong"}
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
