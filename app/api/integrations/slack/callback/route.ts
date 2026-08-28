import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, verifyOAuthState } from "@/lib/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = verifyOAuthState(url.searchParams.get("state"));
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL(`/integrations?error=slack_oauth`, request.url));
  }

  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/integrations?error=slack_config`, request.url));
  }

  const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI?.trim()
    || new URL("/api/integrations/slack/callback", request.url).toString();

  const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL(`/integrations?error=slack_token`, request.url));
  }

  const result = await tokenResponse.json() as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    token_type?: string;
    scope?: string;
    team?: { id?: string; name?: string };
    bot_user_id?: string;
    app_id?: string;
    authed_user?: { id?: string };
  };

  if (!result.ok || !result.access_token || !result.team?.id) {
    return NextResponse.redirect(new URL(`/integrations?error=slack_token`, request.url));
  }

  const user = await db.user.findUnique({
    where: { id: state },
    include: { members: true },
  });
  if (!user || !user.members[0]) {
    return NextResponse.redirect(new URL(`/integrations?error=organization`, request.url));
  }

  const organizationId = user.members[0].organizationId;
  await db.integration.upsert({
    where: {
      organizationId_provider: { organizationId, provider: "slack" },
    },
    create: {
      userId: state,
      organizationId,
      provider: "slack",
      enabled: true,
      accountEmail: result.team.name || result.team.id,
      accessToken: encrypt(result.access_token),
      webhookUrl: result.team.id,
    },
    update: {
      enabled: true,
      accountEmail: result.team.name || result.team.id,
      accessToken: encrypt(result.access_token),
      webhookUrl: result.team.id,
    },
  });

  return NextResponse.redirect(new URL(`/integrations?connected=slack`, request.url));
}
