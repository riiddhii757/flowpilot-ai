import { NextResponse } from "next/server";
import { z } from "zod";
import { triageRequest } from "@/lib/ai";

const input = z.object({ text: z.string().min(3).max(5000) });

export async function POST(request: Request) {
  try {
    const body = input.parse(await request.json());
    const result = await triageRequest(body.text);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
