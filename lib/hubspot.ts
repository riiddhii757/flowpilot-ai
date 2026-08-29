import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/oauth";

const HUBSPOT_OAUTH = "https://api.hubapi.com/oauth/2026-03";
const HUBSPOT_API = "https://api.hubapi.com";

export const HUBSPOT_SCOPES =
  process.env.HUBSPOT_OAUTH_SCOPES?.trim() ||
  "oauth crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write";

export function hubSpotConfig() {
  const clientId = process.env.HUBSPOT_CLIENT_ID?.trim();
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const configuredRedirect = process.env.HUBSPOT_REDIRECT_URI?.trim();
  return {
    clientId,
    clientSecret,
    redirectUri: configuredRedirect || `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""}/api/integrations/hubspot/callback`,
  };
}

export async function refreshHubSpotToken(integration: {
  id: string;
  refreshToken: string | null;
}) {
  const config = hubSpotConfig();
  if (!config || !integration.refreshToken) return null;

  let refreshToken: string;
  try {
    refreshToken = decrypt(integration.refreshToken);
  } catch {
    return null;
  }

  const response = await fetch(`${HUBSPOT_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !data?.access_token) return null;

  const expiresAt = new Date(Date.now() + Math.max(60, data.expires_in || 1800) * 1000);
  await db.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: encrypt(data.access_token),
      refreshToken: data.refresh_token ? encrypt(data.refresh_token) : undefined,
      tokenExpiresAt: expiresAt,
      enabled: true,
    },
  });
  return data.access_token;
}

export async function getHubSpotAccessToken(integration: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}) {
  if (!integration.accessToken) return null;
  if (integration.tokenExpiresAt && integration.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    try {
      return decrypt(integration.accessToken);
    } catch {
      return null;
    }
  }
  return refreshHubSpotToken(integration);
}

export async function hubSpotApi(
  integration: { id: string; accessToken: string | null; refreshToken: string | null; tokenExpiresAt: Date | null },
  path: string,
  init: RequestInit = {},
) {
  const token = await getHubSpotAccessToken(integration);
  if (!token) return { ok: false, status: 401, data: null };
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${HUBSPOT_API}${path}`, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}
