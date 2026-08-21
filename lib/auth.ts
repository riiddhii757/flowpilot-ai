import { z } from "zod";

export const roles = ["owner", "admin", "member", "viewer"] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;

export function canManageWorkflows(role: Role) { return role === "owner" || role === "admin"; }
export function canApprove(role: Role) { return role === "owner" || role === "admin" || role === "member"; }
export function canView(role: Role) { return roles.includes(role); }
