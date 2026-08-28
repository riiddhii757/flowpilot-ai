import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { oauthState, googleRedirectUri } from "@/lib/oauth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const provider = new URL(request.url).searchParams.get("provider");
  if (provider !== "calendar" && provider !== "gmail") {
    return NextResponse.json({ error: "Unsupported Google provider" }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth is not configured for this deployment. Add GOOGLE_CLIENT_ID to Vercel Production and redeploy." },
      { status: 503 },
    );
  }

  const scopes = provider === "calendar"
    ? ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"].join(" ")
    : ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"].join(" ");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", `${provider}:${oauthState(user.id)}`);

  return NextResponse.redirect(url);
}
