import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const secret = () => process.env.FLOWPILOT_SESSION_SECRET || "local-development-only-flowpilot-session-secret";
const key = () => createHash("sha256").update(secret()).digest();

export function oauthState(userId: string, nonce = randomBytes(24).toString("hex")) {
  const payload = `${userId}.${nonce}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string | null) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, nonce, provided] = parts;
  if (!userId || !nonce || !provided) return null;
  const expected = createHmac("sha256", secret()).update(`${userId}.${nonce}`).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decrypt(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted credential");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function googleRedirectUri(request: Request) {
  // Accept both names so the Vercel configuration is less error-prone.
  // GOOGLE_OAUTH_REDIRECT_URI is the canonical name; GOOGLE_REDIRECT_URI is
  // supported as a backwards-compatible alias.
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
  return configured?.trim() || new URL("/api/integrations/google/callback", request.url).toString();
}
