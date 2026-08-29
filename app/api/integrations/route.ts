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

type IntegrationRow = {
  enabled: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  webhookUrl: string | null;
  accountEmail?: string | null;
};

async function verifyResendApiKey() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, reason: "missing" as const };

  try {
    // Do not use /domains for verification: Resend Sending Access keys are
    // intentionally limited to sending and may not read account resources.
    // A lightweight authenticated request to the API-keys endpoint is not
    // suitable either because it also requires account-management access.
    // For now, validate the credential format and let the real send endpoint
    // perform the permission check when the user sends a test email.
    if (!key.startsWith("re_") || key.length < 20) {
      return { ok: false, reason: "invalid-format" as const };
    }
    return { ok: true, reason: "configured" as const };
  } catch {
    return { ok: false, reason: "invalid" as const };
  }
}

async function isRealConnection(provider: string, row: IntegrationRow | undefined) {
  if (!row?.enabled) return false;
  if (provider === "slack") return Boolean(row.accessToken);
  if (provider === "google-calendar" || provider === "google-gmail") return Boolean(row.accessToken && row.refreshToken);
  if (provider === "zapier") return Boolean(row.webhookUrl);
  if (provider === "email") return Boolean(row.accessToken && (await verifyResendApiKey()).ok);
  return false;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.members[0]) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const rows = await db.integration.findMany({ where: { organizationId: user.members[0].organizationId } });
  const integrations = await Promise.all(providers.map(async (provider) => {
    const row = rows.find((item) => item.provider === provider);
    const verified = await isRealConnection(provider, row);
    return {
      provider,
      enabled: verified,
      accountEmail: verified ? row?.accountEmail || (provider === "email" ? process.env.RESEND_FROM_EMAIL || null : null) : null,
    };
  }));

  return NextResponse.json({ ok: true, integrations });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.members[0]) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = integrationSchema.parse(await request.json());
  const organizationId = user.members[0].organizationId;

  if (body.provider === "email") {
    const verification = await verifyResendApiKey();
    if (!verification.ok) {
      const message = verification.reason === "missing"
        ? "RESEND_API_KEY is not available to this Vercel deployment. Check the Production environment variable and redeploy."
        : "RESEND_API_KEY does not look like a valid Resend API key.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const integration = await db.integration.upsert({
      where: { organizationId_provider: { organizationId, provider: "email" } },
      create: {
        userId: user.id,
        organizationId,
        provider: "email",
        enabled: true,
        accessToken: "resend-env",
        accountEmail: process.env.RESEND_FROM_EMAIL || null,
      },
      update: {
        enabled: true,
        accessToken: "resend-env",
        accountEmail: process.env.RESEND_FROM_EMAIL || null,
      },
    });

    return NextResponse.json({ ok: true, integration: { provider: integration.provider, enabled: true, accountEmail: integration.accountEmail } });
  }

  if (body.provider !== "zapier") {
    return NextResponse.json({ error: "This integration must be connected through its dedicated setup flow" }, { status: 400 });
  }
  if (!body.webhookUrl) return NextResponse.json({ error: "Zapier webhook URL is required" }, { status: 400 });

  const integration = await db.integration.upsert({
    where: { organizationId_provider: { organizationId, provider: body.provider } },
    create: { userId: user.id, organizationId, provider: body.provider, enabled: true, webhookUrl: body.webhookUrl },
    update: { enabled: true, webhookUrl: body.webhookUrl },
  });

  return NextResponse.json({ ok: true, integration: { provider: integration.provider, enabled: true } });
}
