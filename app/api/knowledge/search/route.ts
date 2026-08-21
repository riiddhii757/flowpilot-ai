import { NextResponse } from "next/server";
import { z } from "zod";
import { searchKnowledge } from "@/lib/rag";

const input = z.object({ query: z.string().min(2).max(1000) });
export async function POST(request: Request) {
  const body = input.parse(await request.json());
  return NextResponse.json({ ok: true, results: await searchKnowledge(body.query) });
}
