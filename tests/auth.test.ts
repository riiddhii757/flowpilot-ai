import assert from "node:assert/strict";
import test from "node:test";
import { canApprove, canManageMembers, canManageSettings, canManageWorkflows, canView, getRole, passwordHash } from "../lib/auth";

test("RBAC: owner has all workspace permissions", () => {
  assert.equal(canManageWorkflows("owner"), true);
  assert.equal(canApprove("owner"), true);
  assert.equal(canManageMembers("owner"), true);
  assert.equal(canManageSettings("owner"), true);
  assert.equal(canView("owner"), true);
});

test("RBAC: admin can manage workspace but cannot exceed owner", () => {
  assert.equal(canManageWorkflows("admin"), true);
  assert.equal(canApprove("admin"), true);
  assert.equal(canManageMembers("admin"), true);
  assert.equal(canManageSettings("admin"), true);
});

test("RBAC: member can approve and view only", () => {
  assert.equal(canApprove("member"), true);
  assert.equal(canView("member"), true);
  assert.equal(canManageWorkflows("member"), false);
  assert.equal(canManageMembers("member"), false);
  assert.equal(canManageSettings("member"), false);
});

test("RBAC: viewer is read-only", () => {
  assert.equal(canView("viewer"), true);
  assert.equal(canApprove("viewer"), false);
  assert.equal(canManageWorkflows("viewer"), false);
  assert.equal(canManageMembers("viewer"), false);
  assert.equal(canManageSettings("viewer"), false);
});

test("role validation rejects unknown roles", () => {
  assert.equal(getRole("owner"), "owner");
  assert.equal(getRole("viewer"), "viewer");
  assert.equal(getRole("superadmin"), null);
});

test("password hashing is deterministic and one-way shaped", () => {
  const first = passwordHash("correct horse battery staple");
  const second = passwordHash("correct horse battery staple");
  assert.equal(first, second);
  assert.notEqual(first, "correct horse battery staple");
  assert.equal(first.length, 64);
});
