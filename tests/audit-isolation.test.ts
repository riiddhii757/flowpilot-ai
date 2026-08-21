import test from "node:test";
import assert from "node:assert/strict";

type AuditLog = { id: string; organizationId: string; action: string };

function logsForOrganization(logs: AuditLog[], organizationId: string) {
  return logs.filter((log) => log.organizationId === organizationId);
}

test("audit history only contains events from the current organization", () => {
  const logs: AuditLog[] = [
    { id: "a1", organizationId: "org-a", action: "Workflow created" },
    { id: "a2", organizationId: "org-b", action: "Secret changed" },
    { id: "a3", organizationId: "org-a", action: "Workflow executed" },
  ];

  const result = logsForOrganization(logs, "org-a");
  assert.deepEqual(result.map((log) => log.id), ["a1", "a3"]);
  assert.equal(result.some((log) => log.organizationId !== "org-a"), false);
});

test("organization B cannot receive organization A audit events", () => {
  const logs: AuditLog[] = [
    { id: "a1", organizationId: "org-a", action: "Workflow created" },
    { id: "b1", organizationId: "org-b", action: "Workflow created" },
  ];

  const result = logsForOrganization(logs, "org-b");
  assert.deepEqual(result.map((log) => log.id), ["b1"]);
});

test("empty organization audit history returns an empty list", () => {
  const logs: AuditLog[] = [{ id: "a1", organizationId: "org-a", action: "Workflow created" }];
  assert.deepEqual(logsForOrganization(logs, "org-missing"), []);
});
