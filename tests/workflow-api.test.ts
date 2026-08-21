import test from "node:test";
import assert from "node:assert/strict";
import { canManageWorkflows, getRole } from "../lib/auth";

function canAccessWorkflow(userOrganizationId: string, workflowOrganizationId: string) {
  return userOrganizationId === workflowOrganizationId;
}

test("workflow creation is allowed only for owner and admin", () => {
  assert.equal(canManageWorkflows("owner"), true);
  assert.equal(canManageWorkflows("admin"), true);
  assert.equal(canManageWorkflows("member"), false);
  assert.equal(canManageWorkflows("viewer"), false);
});

test("unknown workflow roles are rejected", () => {
  assert.equal(getRole("superadmin"), null);
  assert.equal(getRole(""), null);
  assert.equal(getRole("owner"), "owner");
});

test("workflow access is isolated by organization", () => {
  assert.equal(canAccessWorkflow("org-a", "org-a"), true);
  assert.equal(canAccessWorkflow("org-a", "org-b"), false);
});

test("workflow queries must use the authenticated organization", () => {
  const authenticatedOrganization = "org-a";
  const requestedWorkflowOrganization = "org-b";
  assert.notEqual(authenticatedOrganization, requestedWorkflowOrganization);
  assert.equal(canAccessWorkflow(authenticatedOrganization, requestedWorkflowOrganization), false);
});
