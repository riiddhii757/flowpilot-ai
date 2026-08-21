import { NextResponse } from "next/server";
import { z } from "zod";

const workflowSchema = z.object({
  name: z.string().min(2).max(100),
  trigger: z.enum(["inbox.received", "lead.created", "invoice.overdue", "webhook.received"]),
});

const workflows = [
  { id: "wf_support", name: "Support triage", trigger: "inbox.received", status: "active", successRate: 96 },
  { id: "wf_sales", name: "Lead qualification", trigger: "lead.created", status: "active", successRate: 91 },
  { id: "wf_finance", name: "Invoice reminders", trigger: "invoice.overdue", status: "active", successRate: 88 },
];

export async function GET() { return NextResponse.json({ ok: true, workflows }); }
export async function POST(request: Request) {
  const body = workflowSchema.parse(await request.json());
  return NextResponse.json({ ok: true, workflow: { id: `wf_${Date.now()}`, ...body, status: "draft", successRate: 0 } }, { status: 201 });
}
