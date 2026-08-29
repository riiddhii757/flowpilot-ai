"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Mail, MessageSquare, Plug, Webhook, CalendarPlus, Zap, ExternalLink, ShieldCheck, LockKeyhole, Copy, Play } from "lucide-react";
import AppShell from "@/components/AppShell";

type Status = { enabled: boolean; accountEmail?: string | null; webhookUrl?: string | null };
type Provider = { id: string; name: string; desc: string; icon: typeof Mail; kind: string; href?: string };

const providers: Provider[] = [
  { id: "slack", name: "Slack", desc: "Send alerts and approval requests to your team.", icon: MessageSquare, kind: "slack" },
  { id: "email", name: "Email", desc: "Send and verify transactional email through Resend.", icon: Mail, kind: "email" },
  { id: "google-gmail", name: "Gmail", desc: "Let FlowPilot read and send Gmail with your approval.", icon: Mail, kind: "google" },
  { id: "webhook", name: "Webhooks", desc: "Connect systems that send HTTP events.", icon: Webhook, kind: "webhook" },
  { id: "crm", name: "CRM", desc: "Sync leads, accounts and customer actions.", icon: Plug, kind: "coming" },
];

const meetings: Provider[] = [
  { id: "google-calendar", name: "Google Calendar", desc: "Create real calendar events from AI requests and scheduled workflows.", icon: CalendarDays, kind: "google" },
  { id: "calendly", name: "Calendly", desc: "Use Calendly booking links and connect booking events when configured.", icon: CalendarPlus, kind: "external", href: "https://calendly.com/" },
  { id: "zapier", name: "Zapier", desc: "Connect FlowPilot to thousands of apps using a real Zapier webhook trigger.", icon: Zap, kind: "zapier", href: "https://zapier.com/apps/webhook/integrations" },
];

function messageOf(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export default function Integrations() {
  const [state, setState] = useState<Record<string, Status>>({});
  const [notice, setNotice] = useState("");
  const [webhook, setWebhook] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showWebhook, setShowWebhook] = useState(false);
  const [showZapier, setShowZapier] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState("");

  useEffect(() => {
    void loadStatus();
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const error = q.get("error");
    if (connected) {
      setNotice(connected === "slack" ? "Slack connected successfully. FlowPilot can now use it." : `${connected === "calendar" ? "Google Calendar" : "Gmail"} connected successfully. FlowPilot can now use it.`);
    } else if (error) {
      setNotice(error.startsWith("slack") ? "Slack authorization could not be completed. Check Slack OAuth settings and Vercel environment variables." : "Google authorization could not be completed. Check OAuth settings and Vercel environment variables.");
    }
  }, []);

  async function loadStatus() {
    try {
      const r = await fetch("/api/integrations", { cache: "no-store" });
      const b: unknown = await r.json();
      if (!r.ok) {
        const obj = b as { error?: unknown };
        setNotice(messageOf(obj.error, "Could not load integration status."));
        return;
      }
      const obj = b as { integrations?: unknown };
      if (!Array.isArray(obj.integrations)) return;
      const next: Record<string, Status> = {};
      for (const item of obj.integrations) {
        if (!item || typeof item !== "object") continue;
        const x = item as { provider?: unknown; enabled?: unknown; accountEmail?: unknown; webhookUrl?: unknown };
        if (typeof x.provider !== "string") continue;
        next[x.provider] = {
          enabled: x.enabled === true,
          accountEmail: typeof x.accountEmail === "string" ? x.accountEmail : null,
          webhookUrl: typeof x.webhookUrl === "string" ? x.webhookUrl : null,
        };
      }
      setState(next);
    } catch {
      setNotice("Could not load integration status.");
    }
  }

  function google(provider: "calendar" | "gmail") { window.location.href = `/api/integrations/google/authorize?provider=${provider}`; }
  function slack() { window.location.href = "/api/integrations/slack/authorize"; }

  async function connectEmail() {
    setEmailBusy(true); setNotice("");
    try {
      const r = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "email", enabled: true, action: "connect" }) });
      const b: unknown = await r.json();
      if (!r.ok) { setNotice(messageOf((b as { error?: unknown }).error, "Email configuration failed.")); return; }
      const send = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "email", enabled: true, action: "send-test" }) });
      const sb: unknown = await send.json();
      if (!send.ok) { setNotice(`Email test failed: ${messageOf((sb as { error?: unknown }).error, "Resend rejected the message.")}`); return; }
      const s = sb as { integration?: { accountEmail?: unknown }; emailId?: unknown };
      setState(x => ({ ...x, email: { enabled: true, accountEmail: typeof s.integration?.accountEmail === "string" ? s.integration.accountEmail : null } }));
      setNotice(`Email connected successfully. Test email sent${typeof s.emailId === "string" ? ` (${s.emailId})` : ""}.`);
    } catch { setNotice("Email connection failed. Please try again."); }
    finally { setEmailBusy(false); }
  }

  async function createWebhook() {
    setNotice("");
    try {
      const r = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "webhook", enabled: true, action: "create-webhook" }) });
      const b: unknown = await r.json();
      if (!r.ok) { setNotice(messageOf((b as { error?: unknown }).error, "Could not create webhook.")); return; }
      const x = b as { integration?: { webhookUrl?: unknown }; secret?: unknown };
      const url = typeof x.integration?.webhookUrl === "string" ? x.integration.webhookUrl : "";
      const secret = typeof x.secret === "string" ? x.secret : "";
      setState(s => ({ ...s, webhook: { enabled: true, webhookUrl: url } }));
      setWebhook(url); setWebhookSecret(secret); setShowWebhook(true);
      setNotice("Webhook created successfully. Save the signing secret now; it is shown only once.");
    } catch { setNotice("Could not create webhook. Please try again."); }
  }

  async function testWebhook() {
    setWebhookBusy(true); setNotice("");
    try {
      const r = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "webhook", enabled: true, action: "send-test-webhook" }) });
      const b: unknown = await r.json();
      if (!r.ok) { setNotice(messageOf((b as { error?: unknown }).error, "Webhook test failed.")); return; }
      setNotice("Webhook test succeeded. FlowPilot received and verified a signed test event.");
    } catch { setNotice("Webhook test failed. Please try again."); }
    finally { setWebhookBusy(false); }
  }

  async function disconnect(provider: string) {
    if (!window.confirm(`Disconnect ${provider}? This will revoke provider access where supported and remove the saved connection.`)) return;
    setDisconnecting(provider); setNotice("");
    try {
      const r = await fetch("/api/integrations", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
      const b: unknown = await r.json();
      if (!r.ok) { setNotice(messageOf((b as { error?: unknown }).error, `Could not disconnect ${provider}.`)); return; }
      setState(s => { const n = { ...s }; delete n[provider]; return n; });
      if (provider === "webhook") { setWebhook(""); setWebhookSecret(""); setShowWebhook(false); }
      setNotice(`${provider} disconnected successfully.`);
    } catch { setNotice(`Could not disconnect ${provider}. Please try again.`); }
    finally { setDisconnecting(""); }
  }

  async function saveZapier() {
    if (!webhook.trim()) { setNotice("Paste the Zapier Catch Hook URL first."); return; }
    try {
      const r = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "zapier", enabled: true, webhookUrl: webhook.trim() }) });
      const b: unknown = await r.json();
      if (!r.ok) { setNotice(messageOf((b as { error?: unknown }).error, "Zapier could not be connected. Check the webhook URL.")); return; }
      setState(s => ({ ...s, zapier: { enabled: true, webhookUrl: webhook.trim() } }));
      setShowZapier(false); setWebhook(""); setNotice("Zapier webhook connected successfully.");
    } catch { setNotice("Zapier connection failed. Please try again."); }
  }

  function disconnectButton(id: string) {
    const busy = disconnecting === id;
    return <button onClick={() => void disconnect(id)} disabled={busy} className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[.05] px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50">{busy ? "Disconnecting…" : "Disconnect"}</button>;
  }

  function renderButton(p: Provider) {
    const on = !!state[p.id]?.enabled;
    if (p.kind === "slack") return on ? disconnectButton(p.id) : <button onClick={slack} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium">Connect Slack</button>;
    if (p.kind === "email") return on ? disconnectButton(p.id) : <button onClick={() => void connectEmail()} disabled={emailBusy} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium">{emailBusy ? "Sending test…" : "Connect Email"}</button>;
    if (p.kind === "google") return on ? disconnectButton(p.id) : <button onClick={() => google(p.id === "google-calendar" ? "calendar" : "gmail")} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium">Connect</button>;
    if (p.kind === "webhook") return on ? <div className="flex flex-wrap gap-2"><button onClick={() => setShowWebhook(true)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Manage</button><button onClick={() => void testWebhook()} disabled={webhookBusy} className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.05] px-4 py-2 text-sm font-medium text-emerald-300 disabled:opacity-50">{webhookBusy ? <><Play size={14}/> Testing…</> : <><Play size={14}/> Send Test Event</>}</button>{disconnectButton(p.id)}</div> : <button onClick={() => void createWebhook()} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium">Create webhook</button>;
    if (p.kind === "zapier") return on ? <div className="flex gap-2">{disconnectButton(p.id)}<button onClick={() => setShowZapier(true)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Manage Zapier</button></div> : <button onClick={() => setShowZapier(true)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300">Connect Zapier</button>;
    if (p.kind === "external") return <a target="_blank" rel="noreferrer" href={p.href} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300">Open Calendly <ExternalLink size={14}/></a>;
    return <button disabled title="This integration does not have an OAuth/API connection configured yet." className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-500">Setup required <LockKeyhole size={14}/></button>;
  }

  return <AppShell><main className="min-h-screen bg-[#08090d] px-6 py-7 text-white lg:px-10"><div className="mx-auto max-w-6xl"><header className="border-b border-white/10 pb-7"><p className="text-sm text-violet-300">Workspace / Integrations</p><h1 className="mt-1 text-3xl font-semibold">Connect your tools</h1><p className="mt-2 text-sm text-zinc-500">Give FlowPilot secure, real-world tools for AI-powered operations.</p></header>{notice && <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-500/[.07] px-4 py-3 text-sm text-violet-200">{notice}</div>}<section className="pt-8"><div className="mb-4"><h2 className="text-lg font-semibold">Core integrations</h2><p className="mt-1 text-sm text-zinc-500">Only real connections are shown as connected.</p></div><div className="space-y-3">{providers.map(p => { const I = p.icon; const on = !!state[p.id]?.enabled; return <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="rounded-xl bg-white/5 p-3"><I size={20}/></div><div className="min-w-[220px] flex-1"><h2 className="font-medium">{p.name}</h2><p className="mt-1 text-sm text-zinc-500">{p.desc}</p>{on && <p className="mt-2 text-xs text-emerald-300"><Check size={13} className="mr-1 inline"/>Connected{state[p.id]?.accountEmail ? ` as ${state[p.id].accountEmail}` : ""}</p>}</div>{renderButton(p)}</div>; })}</div></section><section className="pt-10"><div className="mb-4"><h2 className="text-lg font-semibold">Meetings & scheduling</h2><p className="mt-1 text-sm text-zinc-500">Real connections for calendar events, booking workflows, and automation.</p></div><div className="grid gap-4 md:grid-cols-3">{meetings.map(p => { const I = p.icon; const on = !!state[p.id]?.enabled; return <div key={p.id} className="rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[.08] to-cyan-400/[.04] p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/5 p-3"><I size={20}/></div><h3 className="font-medium">{p.name}</h3></div><p className="mt-4 min-h-16 text-sm leading-6 text-zinc-400">{p.desc}</p>{renderButton(p)}</div>; })}</div></section><div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-4 text-xs text-zinc-500"><ShieldCheck size={17} className="text-emerald-400"/>OAuth access tokens are encrypted before storage. Each integration is scoped to your workspace.</div></div>{showWebhook && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur"><div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#101219] p-6"><h2 className="text-xl font-semibold">Webhook connection</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Send signed JSON POST requests to this endpoint. Sign the exact request body with HMAC-SHA256 using the secret and send the result in <code>X-FlowPilot-Signature</code> as <code>sha256=&lt;hex&gt;</code>.</p><label className="mt-5 block text-xs text-zinc-500">Endpoint</label><div className="mt-2 flex gap-2"><input readOnly value={state.webhook?.webhookUrl || webhook} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"/><button onClick={() => void navigator.clipboard.writeText(state.webhook?.webhookUrl || webhook)} className="rounded-xl border border-white/10 px-3"><Copy size={16}/></button></div>{webhookSecret && <><label className="mt-5 block text-xs text-zinc-500">Signing secret — save this now</label><div className="mt-2 flex gap-2"><input readOnly value={webhookSecret} className="w-full rounded-xl border border-amber-400/20 bg-black/20 px-4 py-3 text-sm"/><button onClick={() => void navigator.clipboard.writeText(webhookSecret)} className="rounded-xl border border-white/10 px-3"><Copy size={16}/></button></div></>}<div className="mt-6 flex justify-end"><button onClick={() => { setShowWebhook(false); setWebhookSecret(""); }} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold">Done</button></div></div></div>}{showZapier && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#101219] p-6"><h2 className="text-xl font-semibold">Connect Zapier</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Create a Webhooks by Zapier Catch Hook and paste its URL here.</p><input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/..." className="mt-5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none"/><div className="mt-5 flex gap-2"><a target="_blank" rel="noreferrer" href={pZapierHref} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm">Open Zapier <ExternalLink size={14}/></a><button onClick={() => void saveZapier()} className="flex-1 rounded-xl bg-violet-500 py-3 text-sm font-semibold">Save connection</button></div></div></div>}</main></AppShell>;
}

const pZapierHref = "https://zapier.com/apps/webhook/integrations";
