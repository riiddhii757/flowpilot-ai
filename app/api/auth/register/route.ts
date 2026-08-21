import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, passwordHash } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  workspace: z.string().min(2).max(80),
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
    const email = body.email.toLowerCase();

    if (await db.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        name: body.name,
        email,
        passwordHash: passwordHash(body.password),
        members: {
          create: {
            email,
            role: "owner",
            organization: { create: { name: body.workspace } },
          },
        },
      },
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to create account" },
      { status: 400 },
    );
  }
}
