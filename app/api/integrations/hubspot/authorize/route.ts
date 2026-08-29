import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { oauthState } from "@/lib/oauth";
import { HUBSPOT_SCOPES, hubSpotConfig } from "@/lib/hubspot";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const config = hubSpotConfig();
  if (!config) {
    return NextResponse.json(
      { error: "HubSpot OAuth is not configured. Add HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET to Vercel and redeploy." },
      { status: 503 },
    );
  }

  const redirectUri = config.redirectUri || new URL("/api/integrations/hubspot/callback", request.url).toString();
  const url = new URL("https://app.hubspot.com/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("scope", HUBSPOT_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", oauthState(user.id));

  return NextResponse.redirect(url);
}
