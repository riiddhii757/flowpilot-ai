import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { message } = await request.json();
    if (typeof message !== "string" || message.trim().length < 2) return NextResponse.json({ error: "Enter a message" }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini is not configured" }, { status: 503 });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: message.trim(),
      config: { systemInstruction: "You are FlowPilot AI, an operations automation assistant. Give concise, practical workflow, operations, and automation advice. When useful, suggest triggers, AI steps, approvals, actions, and audit considerations." },
    });
    return NextResponse.json({ ok: true, text: response.text || "I could not generate a response." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed" }, { status: 500 });
  }
}
