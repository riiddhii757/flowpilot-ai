"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft, CheckCircle2, Clock3, XCircle } from "lucide-react";

type Metadata = Record<string, unknown>;
type Log = { id: string; action: string; actor: string; metadata: Metadata | null; createdAt: string };

const label = (action: string) => action.replaceAll(".", " → ").replaceAll("_", " ");
const iconFor = (action: string) => action.includes("failed") ? XCircle : action.includes("completed") ? CheckCircle2 : Clock3;

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/audit/list")
      .then(async (res) => { const body = await res.json(); if (!res.ok) throw new Error(body.error || "Unable to load activity"); return body; })
      .then((body) => setLogs(body.logs as Log[]))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load activity"))
      .finally(() => setLoading(false));
  }, []);

  return <main className="min-h-screen bg-[#08090d] px-6 py-8 text-white lg:px-12">
    <div className="mx-auto max-w-4xl">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"><ArrowLeft size={15}/> Back to overview</a>
      <div className="mt-8 flex items-center gap-3"><div className="rounded-xl bg-violet-500/15 p-3"><Activity size={20} className="text-violet-300"/></div><div><p className="text-sm text-zinc-500">Workspace / Activity</p><h1 className="text-2xl font-semibold">Audit trail</h1></div></div>
      <p className="mt-2 text-sm text-zinc-500">A chronological record of automation, AI, approval, and execution events.</p>

      {loading && <div className="mt-8 space-y-3 animate-pulse">{[1,2,3,4].map((x) => <div key={x} className="h-20 rounded-2xl bg-white/5"/>)}</div>}
      {error && <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">{error}</div>}
      {!loading && !error && !logs.length && <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center"><Activity className="mx-auto text-zinc-600"/><p className="mt-4 font-medium">No activity yet</p><p className="mt-1 text-sm text-zinc-500">Automation events will appear here as FlowPilot processes work.</p></div>}
      {!loading && !error && logs.length > 0 && <div className="relative mt-8 space-y-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-white/10">{logs.map((log) => { const Icon = iconFor(log.action); return <article key={log.id} className="relative flex gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 pl-4"><div className="z-10 rounded-full border border-white/10 bg-[#11131a] p-2"><Icon size={16} className="text-zinc-400"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-medium capitalize">{label(log.action)}</h2><time className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</time></div><p className="mt-1 text-xs text-zinc-500">Actor: {log.actor}</p>{log.metadata && <pre className="mt-3 overflow-x-auto rounded-lg bg-black/20 p-3 text-[11px] leading-5 text-zinc-500">{JSON.stringify(log.metadata, null, 2)}</pre>}</div></article>; })}</div>}
    </div>
  </main>;
}
