import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const integrationSchema = z.object({
  provider: z.enum(["slack", "email", "webhook", "crm", "google-calendar", "google-gmail", "calendly", "zapier"]),
  enabled: z.boolean(),
  webhookUrl: z.string().url().optional(),
});

const providers = ["slack", "email", "webhook", "crm", "google-calendar", "google-gmail", "calendly", "zapier"] as const;

function isRealConnection(provider: string, row: { enabled: boolean; accessToken: string | null; refreshToken: string | null; webhookUrl: string | null } | undefined) {
  if (!row?.enabled) return false;
  if (provider === "google-calendar" || provider === "google-gmail") return Boolean(row.accessToken && row.refreshToken);
  if (provider === "zapier") return Boolean(row.webhookUrl);
  return false;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.members[0]) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const rows = await db.integration.findMany({ where: { organizationId: user.members[0].organizationId } });
  return NextResponse.json({
    ok: true,
    integrations: providers.map((provider) => {
      const row = rows.find((item) => item.provider === provider);
      const verified = isRealConnection(provider, row);
      return {
        provider,
        enabled: verified,
        accountEmail: verified ? row?.accountEmail || null : null,
      };
    }),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.members[0]) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = integrationSchema.parse(await request.json());
  if (body.provider !== "zapier") {
    return NextResponse.json({ error: "Google integrations must be connected through OAuth" }, { status: 400 });
  }
  if (!body.webhookUrl) return NextResponse.json({ error: "Zapier webhook URL is required" }, { status: 400 });

  const organizationId = user.members[0].organizationId;
  const integration = await db.integration.upsert({
    where: { organizationId_provider: { organizationId, provider: body.provider } },
    create: { userId: user.id, organizationId, provider: body.provider, enabled: true, webhookUrl: body.webhookUrl },
    update: { enabled: true, webhookUrl: body.webhookUrl },
  });

  return NextResponse.json({ ok: true, integration: { provider: integration.provider, enabled: true } });
}
