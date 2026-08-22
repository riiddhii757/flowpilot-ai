"use client";
import { useState } from "react";
import { Bot, Sparkles, Send, Wand2 } from "lucide-react";
import AppShell from "@/components/AppShell";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function ask(prompt?: string) {
    const text = (prompt ?? message).trim();
    if (!text || loading) return;
    setMessage(text); setLoading(true); setError("");
    try { const res = await fetch("/api/ai/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) }); const body = await res.json(); if (!res.ok) throw new Error(body.error || "Unable to reach AI"); setAnswer(body.text); } catch (e) { setError(e instanceof Error ? e.message : "AI request failed"); } finally { setLoading(false); }
  }
  return <AppShell><main className="min-h-screen px-6 py-8 lg:px-10"><div className="mx-auto max-w-5xl"><div className="flex items-start justify-between gap-6"><div><div className="flex items-center gap-2 text-xs uppercase tracking-[.18em] text-violet-300"><Sparkles size={14}/>FlowPilot AI</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">What should we automate?</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Describe an operations problem in plain English and get a practical automation plan.</p></div><div className="hidden rounded-2xl border border-violet-400/15 bg-violet-500/[.06] p-4 sm:block"><Bot className="text-violet-300"/></div></div>
      <section className="mt-8 rounded-3xl border border-white/[.08] bg-gradient-to-br from-white/[.045] to-violet-500/[.04] p-5 shadow-2xl shadow-violet-950/10"><div className="min-h-[320px] rounded-2xl bg-black/15 p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15"><Bot size={17} className="text-violet-300"/></div><div><p className="text-sm font-medium">FlowPilot AI</p><p className="mt-1 text-sm leading-6 text-zinc-400">I can help design workflows, triage logic, approval steps, and operational automations.</p></div></div>{answer && <div className="mt-6 ml-12 whitespace-pre-wrap rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-sm leading-6 text-zinc-300">{answer}</div>}{loading && <div className="mt-6 ml-12 flex items-center gap-2 text-sm text-zinc-500"><span className="h-2 w-2 animate-pulse rounded-full bg-violet-400"/>Thinking through your workflow...</div>}{error && <div className="mt-6 ml-12 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-sm text-red-300">{error}</div>}</div>
        <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-4 flex gap-2 rounded-2xl border border-white/[.08] bg-[#0c0e14] p-2"><input value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. When a new support ticket arrives, summarize it and route urgent issues..." className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-zinc-700"/><button disabled={!message.trim() || loading} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500 text-white disabled:opacity-40"><Send size={17}/></button></form>
      </section>
      <div className="mt-5 grid gap-3 md:grid-cols-3">{["Create a support triage workflow","Automate weekly operations reports","Design an approval flow for invoices"].map(x => <button key={x} onClick={() => ask(x)} className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-left text-sm text-zinc-400 transition hover:border-violet-400/20 hover:bg-violet-500/[.05]"><Wand2 size={16} className="text-violet-300"/>{x}</button>)}</div>
    </div></main></AppShell>;
}
