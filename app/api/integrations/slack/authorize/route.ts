import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { oauthState } from "@/lib/oauth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "Slack OAuth is not configured. Add SLACK_CLIENT_ID to Vercel and redeploy." },
      { status: 503 },
    );
  }

  const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI?.trim()
    || new URL("/api/integrations/slack/callback", request.url).toString();
  const scopes = process.env.SLACK_BOT_SCOPES?.trim()
    || "chat:write,channels:read,groups:read";

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", oauthState(user.id));

  return NextResponse.redirect(url);
}
