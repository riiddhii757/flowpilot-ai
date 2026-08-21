import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, passwordHash } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.FLOWPILOT_SESSION_SECRET) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please configure FLOWPILOT_SESSION_SECRET in the production deployment." },
        { status: 503 },
      );
    }

    const body = schema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });

    if (!user || user.passwordHash !== passwordHash(body.password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Please enter a valid email and a password with at least 8 characters." }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to sign in" },
      { status: 400 },
    );
  }
}
