import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const user = await db.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User account not found. Sign up before creating a workspace." },
        { status: 404 },
      );
    }

    const org = await db.organization.create({
      data: {
        name: body.name,
        members: {
          create: {
            userId: user.id,
            email: user.email,
            role: "owner",
          },
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ ok: true, organization: org }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create workspace" },
      { status: 400 },
    );
  }
}

export async function GET() {
  const organizations = await db.organization.findMany({
    include: { members: true, workflows: true },
    take: 20,
  });

  return NextResponse.json({ ok: true, organizations });
}
