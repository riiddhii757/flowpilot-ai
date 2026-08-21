import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";

export const roles = ["owner", "admin", "member", "viewer"] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;
export function canManageWorkflows(role: Role) { return role === "owner" || role === "admin"; }
export function canApprove(role: Role) { return role === "owner" || role === "admin" || role === "member"; }
export function canView(role: Role) { return roles.includes(role); }

const COOKIE = "flowpilot_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function passwordHash(password: string) { return hash(password); }
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  (await cookies()).set(COOKIE, `${userId}.${token}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function getCurrentUser() {
  const value = (await cookies()).get(COOKIE)?.value;
  const userId = value?.split(".")[0];
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, include: { members: { include: { organization: true } } } });
}
