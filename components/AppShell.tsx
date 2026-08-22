"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Bot, Inbox, LogOut, Settings, Users, Zap, Plug } from "lucide-react";
const items = [
  { href: "/", label: "Overview", Icon: Activity },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/workflows", label: "Automations", Icon: Zap },
  { href: "/integrations", label: "Integrations", Icon: Plug },
  { href: "/ai-assistant", label: "AI Assistant", Icon: Bot },
  { href: "/team", label: "Team", Icon: Users },
  { href: "/settings", label: "Settings", Icon: Settings },
];
export default function AppShell({ children, user, organization }: { children: React.ReactNode; user?: { name: string; email: string }; organization?: { name: string; role: string } }) {
  const pathname = usePathname(); const router = useRouter();
  async function logout(){ await fetch("/api/auth/logout",{method:"POST"}); router.replace("/auth"); router.refresh(); }
  return <div className="min-h-screen bg-[#07080c] text-white"><aside className="fixed inset-y-0 z-40 hidden w-72 border-r border-white/[.07] bg-[#0a0c11]/95 px-5 py-6 lg:flex lg:flex-col"><Link href="/" className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-400/20"><Bot size={20} className="text-violet-300"/></span><span><span className="block text-[17px] font-semibold tracking-tight">FlowPilot</span><span className="block text-[10px] uppercase tracking-[.18em] text-zinc-600">AI operations</span></span></Link>{organization&&<div className="mt-7 rounded-2xl border border-white/[.07] bg-white/[.025] p-3"><p className="truncate text-sm font-medium">{organization.name}</p><p className="mt-1 text-[11px] uppercase tracking-wider text-violet-300">{organization.role}</p></div>}<nav className="mt-7 space-y-1.5">{items.map(({href,label,Icon})=>{const active=href==="/"?pathname==="/":pathname.startsWith(href);return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${active?"bg-violet-500/12 text-white ring-1 ring-violet-400/15":"text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200"}`}><Icon size={17} className={active?"text-violet-300":"text-zinc-600 group-hover:text-zinc-300"}/>{label}</Link>})}</nav><div className="mt-auto border-t border-white/[.07] pt-4">{user&&<div className="mb-3 flex items-center gap-3 rounded-xl p-2"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-zinc-600">{user.email}</p></div></div>}<button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-zinc-500 transition hover:bg-red-400/5 hover:text-red-300"><LogOut size={17}/>Sign out</button></div></aside><div className="lg:pl-72">{children}</div></div>;
}
