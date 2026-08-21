import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";

export const roles = ["owner", "admin", "member", "viewer"] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;

export function canManageWorkflows(role: Role) { return role === "owner" || role === "admin"; }
export function canApprove(role: Role) { return role === "owner" || role === "admin" || role === "member"; }
export function canView(role: Role) { return roles.includes(role); }
export function canManageMembers(role: Role) { return role === "owner" || role === "admin"; }
export function canManageSettings(role: Role) { return role === "owner" || role === "admin"; }

const COOKIE = "flowpilot_session";
const SESSION_TTL = 60 * 60 * 24 * 7;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function sessionSecret() {
  const secret = process.env.FLOWPILOT_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("FLOWPILOT_SESSION_SECRET is required in production");
  return "local-development-only-flowpilot-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

export function passwordHash(password: string) { return hash(password); }

export async function createSession(userId: string) {
  const nonce = randomBytes(32).toString("hex");
  const payload = `${userId}.${nonce}`;
  const value = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL });
}

export async function clearSession() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

function readSession(value?: string) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, nonce, providedSignature] = parts;
  if (!userId || !nonce || !providedSignature) return null;
  const expected = sign(`${userId}.${nonce}`);
  const a = Buffer.from(providedSignature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export async function getSession() {
  const userId = readSession((await cookies()).get(COOKIE)?.value);
  if (!userId) return null;
  return { userId };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId }, include: { members: { include: { organization: true } } } });
}

export function getRole(value: string): Role | null {
  const result = roleSchema.safeParse(value);
  return result.success ? result.data : null;
}
