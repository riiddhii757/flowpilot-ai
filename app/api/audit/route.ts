import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  organizationId: z.string().min(1),
  action: z.string().min(1),
  actor: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const metadata = body.metadata
      ? (JSON.parse(JSON.stringify(body.metadata)) as Prisma.InputJsonValue)
      : undefined;

    const log = await db.auditLog.create({
      data: {
        organizationId: body.organizationId,
        action: body.action,
        actor: body.actor,
        metadata,
      },
    });

    return NextResponse.json({ ok: true, log }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Database error" },
      { status: 400 },
    );
  }
}
