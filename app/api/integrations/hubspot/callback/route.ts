import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, verifyOAuthState } from "@/lib/oauth";
import { hubSpotConfig } from "@/lib/hubspot";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = verifyOAuthState(url.searchParams.get("state"));
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/integrations?error=hubspot_oauth", request.url));
  }

  const config = hubSpotConfig();
  if (!config) return NextResponse.redirect(new URL("/integrations?error=hubspot_config", request.url));

  const redirectUri = config.redirectUri || new URL("/api/integrations/hubspot/callback", request.url).toString();
  const tokenResponse = await fetch("https://api.hubapi.com/oauth/2026-03/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    cache: "no-store",
  });

  const result = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    hub_id?: number;
    user_id?: number;
    scopes?: string[];
    error?: string;
    error_description?: string;
  } | null;

  if (!tokenResponse.ok || !result?.access_token || !result.refresh_token || !result.hub_id) {
    return NextResponse.redirect(new URL("/integrations?error=hubspot_token", request.url));
  }

  const user = await db.user.findUnique({ where: { id: state }, include: { members: true } });
  if (!user || !user.members[0]) return NextResponse.redirect(new URL("/integrations?error=organization", request.url));

  const organizationId = user.members[0].organizationId;
  const expiresAt = new Date(Date.now() + Math.max(60, result.expires_in || 1800) * 1000);

  await db.integration.upsert({
    where: { organizationId_provider: { organizationId, provider: "crm" } },
    create: {
      userId: state,
      organizationId,
      provider: "crm",
      enabled: true,
      accountEmail: `HubSpot ${result.hub_id}`,
      accessToken: encrypt(result.access_token),
      refreshToken: encrypt(result.refresh_token),
      tokenExpiresAt: expiresAt,
      webhookUrl: String(result.hub_id),
    },
    update: {
      enabled: true,
      accountEmail: `HubSpot ${result.hub_id}`,
      accessToken: encrypt(result.access_token),
      refreshToken: encrypt(result.refresh_token),
      tokenExpiresAt: expiresAt,
      webhookUrl: String(result.hub_id),
    },
  });

  return NextResponse.redirect(new URL("/integrations?connected=hubspot", request.url));
}
