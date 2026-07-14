"use client";

import type { Id } from "../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Ban, CheckCircle2, Clock3, Coins, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);
}

function jobCost(job: { estimatedCostUsd: number; generation?: unknown }): number {
  const actual = (job.generation as { costUsd?: unknown } | undefined)?.costUsd;
  return typeof actual === "number" ? actual : job.estimatedCostUsd;
}

export default function OperationsPage() {
  const dashboard = useQuery(api.generationJobs.dashboard);
  const cancel = useMutation(api.generationJobs.cancel);
  const resume = useMutation(api.generationJobs.resume);
  const [selectedJobId, setSelectedJobId] = useState<Id<"generationJobs"> | null>(null);
  const events = useQuery(api.generationJobs.events, selectedJobId ? { jobId: selectedJobId } : "skip");

  if (!dashboard) return <div className="grid flex-1 place-items-center text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /></div>;

  const cards = [
    { label: "Jobs (24h)", value: dashboard.summary.total, icon: Clock3 },
    { label: "Generation failures", value: dashboard.summary.generationFailures, icon: XCircle },
    { label: "Verification failures", value: dashboard.summary.verificationFailures, icon: AlertTriangle },
    { label: "Estimated cost", value: money(dashboard.summary.costUsd), icon: Coins },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operations</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Generation activity</h1>
          <p className="mt-2 text-sm text-muted-foreground">Live stages, retries, verification failures, quotas, and provider costs.</p>
        </div>
        <Link href="/create" className="rounded-xl gradient-warm px-4 py-2.5 text-sm font-bold text-primary-foreground">Create a game</Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Generation summary">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card/80 p-5">
            <Icon className="size-5 text-primary" />
            <p className="mt-4 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <div className="rounded-2xl border border-border bg-card/80 p-5">
          <h2 className="font-display text-lg font-bold">Your daily limits</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <QuotaRow label="Concurrent jobs" value={`${dashboard.summary.active} / ${dashboard.limits.activeJobs}`} />
            <QuotaRow label="Jobs per day" value={`${dashboard.summary.total} / ${dashboard.limits.jobsPerDay}`} />
            <QuotaRow label="Daily budget" value={`${money(dashboard.summary.costUsd)} / ${money(dashboard.limits.costUsdPerDay)}`} />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/80 p-5">
          <h2 className="font-display text-lg font-bold">Providers</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {dashboard.providerTotals.map((provider) => (
              <div key={provider.provider} className="rounded-xl bg-muted/60 p-3">
                <p className="text-sm font-semibold capitalize">{provider.provider}</p>
                <p className="mt-2 text-lg font-bold">{money(provider.costUsd)}</p>
                <p className="text-xs text-muted-foreground">{provider.jobs} jobs · {provider.failures} failed</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card/80 p-5">
        <h2 className="font-display text-lg font-bold">Recent jobs</h2>
        <div className="mt-4 grid gap-3">
          {dashboard.recent.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No generation jobs in the last 24 hours.</p> : null}
          {dashboard.recent.map((job) => {
            const verify = job.verifyLoops.at(-1) as { pass?: boolean } | undefined;
            const active = job.status === "queued" || job.status === "running" || job.status === "retrying";
            return (
              <article key={job._id} className="rounded-xl border border-border bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" onClick={() => setSelectedJobId(job._id)} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <p className="truncate text-sm font-semibold">{(job.intent as { prompt?: string }).prompt ?? "Untitled generation"}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">{job.provider} · {job.stage} · attempt {job.attempt}/{job.maxAttempts}</p>
                  </button>
                  <div className="flex items-center gap-2">
                    <StatusPill status={job.status} verificationFailed={verify?.pass === false} />
                    <span className="text-xs text-muted-foreground">{money(jobCost(job))}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full gradient-warm" style={{ width: `${job.progress}%` }} /></div>
                {job.error ? <p className="mt-3 text-xs text-primary">{job.error}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.gameId ? <Link href={`/games/${job.gameId}`} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary/50">Open game</Link> : null}
                  {active ? <button type="button" onClick={() => void cancel({ jobId: job._id })} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"><Ban className="size-3" /> Cancel</button> : null}
                  {job.status === "failed" || job.status === "canceled" ? <button type="button" onClick={() => void resume({ jobId: job._id })} className="flex items-center gap-1.5 rounded-lg border border-primary/50 px-3 py-1.5 text-xs text-primary"><RotateCcw className="size-3" /> Resume</button> : null}
                  <button type="button" onClick={() => setSelectedJobId(job._id)} className="rounded-lg px-3 py-1.5 text-xs text-accent">Inspect trace</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedJobId ? (
        <section className="mt-6 rounded-2xl border border-border bg-card/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Job trace</h2>
            <button type="button" onClick={() => setSelectedJobId(null)} className="text-sm text-muted-foreground">Close</button>
          </div>
          <ol className="mt-4 grid gap-3">
            {events?.map((event) => (
              <li key={event._id} className="rounded-xl bg-background/40 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className={event.level === "error" ? "text-primary" : event.level === "warning" ? "text-accent" : "text-foreground"}>{event.message}</span>
                  <span className="text-xs text-muted-foreground">{event.stage} · attempt {event.attempt}</span>
                </div>
                {event.details ? <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(event.details, null, 2)}</pre> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function QuotaRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}

function StatusPill({ status, verificationFailed }: { status: string; verificationFailed: boolean }) {
  if (status === "succeeded" && !verificationFailed) return <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400"><CheckCircle2 className="size-3" /> Passed</span>;
  if (verificationFailed) return <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300"><AlertTriangle className="size-3" /> Verify failed</span>;
  if (status === "failed") return <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-300"><XCircle className="size-3" /> Failed</span>;
  return <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize text-muted-foreground">{status}</span>;
}
