"use client";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Bot, CheckCircle2, Clock3, Inbox, Plus, Search, Settings, ShieldCheck, Users, Zap } from "lucide-react";

type DashboardData = {
  organization: { name: string; role: string };
  user: { name: string; email: string };
  metrics: { workflows: number; tasksProcessed: number; successRate: number; pendingApprovals: number; totalTasks: number };
  workflows: { id: string; name: string; trigger: string; status: string; successRate: number }[];
  tasks: { id: string; title: string; status: string; priority: string; createdAt: string; workflow?: { name: string } | null }[];
  recentActivity: { id: string; action: string; actor: string; createdAt: string }[];
};

const nav = [
  { Icon: Activity, name: "Overview" },
  { Icon: Inbox, name: "Inbox" },
  { Icon: Zap, name: "Automations" },
  { Icon: Bot, name: "AI Assistant" },
  { Icon: Users, name: "Team" },
  { Icon: Settings, name: "Settings" },
];

const formatTime = (date: string) => new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round((new Date(date).getTime() - Date.now()) / 60000), "minute");

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load dashboard");
        return body;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="min-h-screen bg-[#08090d] p-10 text-white"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-8 w-64 rounded bg-white/10"/><div className="mt-8 grid gap-4 md:grid-cols-4">{[1,2,3,4].map((x) => <div key={x} className="h-32 rounded-2xl bg-white/5"/>)}</div></div></main>;
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#08090d] p-6 text-white"><div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center"><h1 className="text-xl font-semibold">Dashboard unavailable</h1><p className="mt-2 text-sm text-zinc-400">{error}</p><a href="/auth" className="mt-5 inline-block rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold">Sign in</a></div></main>;

  const { metrics, organization, user, workflows, tasks, recentActivity } = data!;
  const cards = [
    { name: "Active workflows", value: metrics.workflows, note: `${workflows.filter((w) => w.status === "active").length} active`, Icon: Zap },
    { name: "Tasks completed", value: metrics.tasksProcessed, note: `${metrics.totalTasks} total tasks`, Icon: CheckCircle2 },
    { name: "Average success", value: `${metrics.successRate}%`, note: workflows.length ? "Across workflows" : "Create your first workflow", Icon: Clock3 },
    { name: "Pending approvals", value: metrics.pendingApprovals, note: metrics.pendingApprovals ? "Needs attention" : "All clear", Icon: ShieldCheck },
  ];

  return <main className="min-h-screen bg-[#08090d] text-white">
    <aside className="fixed inset-y-0 hidden w-64 border-r border-white/10 bg-[#0b0d12] p-5 lg:block">
      <div className="flex items-center gap-2 text-xl font-semibold"><div className="rounded-lg bg-violet-500/15 p-2"><Bot size={19}/></div>FlowPilot</div>
      <p className="mt-2 truncate text-xs text-zinc-500">{organization.name}</p>
      <nav className="mt-10 space-y-1 text-sm">{nav.map(({ Icon, name }, i) => <div key={name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? "bg-white/10" : "text-zinc-400 hover:bg-white/5"}`}><Icon size={17}/>{name}</div>)}</nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-zinc-500">{user.email}</p><p className="mt-1 text-[11px] uppercase text-violet-300">{organization.role}</p></div>
    </aside>
    <section className="lg:ml-64">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 lg:px-10"><div><p className="text-sm text-zinc-500">{organization.name} / Overview</p><h1 className="mt-1 text-2xl font-semibold">Good morning, {user.name.split(" ")[0]}</h1></div><div className="flex gap-2"><button className="rounded-xl border border-white/10 p-2.5 text-zinc-400"><Search size={17}/></button><button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"><Plus size={16}/> New automation</button></div></header>
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(({ name, value, note, Icon }) => <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5" key={name}><div className="flex justify-between text-sm text-zinc-400"><span>{name}</span><Icon size={17}/></div><p className="mt-4 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-zinc-500">{note}</p></div>)}</div>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">Recent workload</h2><p className="mt-1 text-sm text-zinc-500">Live tasks from your workspace</p><div className="mt-6 space-y-2">{tasks.length ? tasks.map((task) => <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 p-4" key={task.id}><div><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-zinc-500">{task.workflow?.name || "Unassigned"} · {formatTime(task.createdAt)}</p></div><span className="text-xs text-zinc-400">{task.status.replaceAll("_", " ")}</span></div>) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No tasks yet. Your automation activity will appear here.</div>}</div></div>
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-6"><div className="flex items-center gap-2"><Bot size={19} className="text-violet-300"/><h2 className="font-semibold">FlowPilot AI</h2></div><h3 className="mt-5 text-lg font-medium">Your workspace is connected.</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Metrics, tasks, workflows and activity on this dashboard are now loaded from your authenticated workspace database.</p><div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-zinc-500">WORKSPACE STATUS</p><p className="mt-2 text-sm text-emerald-300">Live database connected</p></div></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Automation health</h2><p className="mt-1 text-sm text-zinc-500">Real workflows in your workspace</p></div><button className="flex items-center gap-1 text-sm text-zinc-400">View all <ArrowUpRight size={15}/></button></div><div className="mt-6 grid gap-3 md:grid-cols-3">{workflows.length ? workflows.slice(0,3).map((workflow) => <div className="rounded-xl border border-white/10 p-4" key={workflow.id}><p className="text-sm font-medium">{workflow.name}</p><p className="mt-1 text-xs text-zinc-500">{workflow.trigger}</p><div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${workflow.successRate}%` }}/></div><p className="mt-2 text-xs text-zinc-500">{workflow.successRate}% successful runs</p></div>) : <div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">No workflows yet. Your first automation will appear here.</div>}</div></div>
        {recentActivity.length > 0 && <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><h2 className="font-semibold">Recent activity</h2><div className="mt-5 space-y-3">{recentActivity.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3 text-sm"><div><span className="font-medium">{item.action}</span><span className="ml-2 text-zinc-500">by {item.actor}</span></div><span className="text-xs text-zinc-500">{formatTime(item.createdAt)}</span></div>)}</div></div>}
      </div>
    </section>
  </main>;
}
