import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/db";
import { canManageWorkflows, getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.members.length === 0) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { message, createWorkflow } = await request.json();
    if (typeof message !== "string" || message.trim().length < 2) return NextResponse.json({ error: "Enter a message" }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini is not configured" }, { status: 503 });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: message.trim(),
      config: { systemInstruction: "You are FlowPilot AI, an operations automation assistant. Give concise, practical workflow, operations, and automation advice. When the user asks to create or automate something, clearly describe the trigger, steps, and actions. Never claim a workflow was created unless the application confirms it." },
    });
    let workflow = null;
    if (createWorkflow && canManageWorkflows(user.members[0].role as Parameters<typeof canManageWorkflows>[0])) {
      const clean = message.trim().replace(/^(create|build|make|automate)\s+(a|an|the)?\s*/i, "").replace(/[.!?]+$/g, "");
      const name = (clean.charAt(0).toUpperCase() + clean.slice(1)).slice(0, 76) || "AI-generated automation";
      workflow = await db.workflow.create({ data: { organizationId: user.members[0].organizationId, name, trigger: "AI-generated workflow" } });
      await db.auditLog.create({ data: { organizationId: user.members[0].organizationId, action: "Workflow created by AI", actor: user.email, metadata: { workflowId: workflow.id, prompt: message.trim() } } });
    }
    return NextResponse.json({ ok: true, text: response.text || "I could not generate a response.", workflow });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 500 });
  }
}
