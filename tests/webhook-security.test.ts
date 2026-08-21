import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

function sign(payload: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

function verify(payload: string, signature: string | null, secret: string) {
  if (!signature) return false;
  return signature === sign(payload, secret);
}

test("valid webhook signature is accepted", () => {
  const payload = JSON.stringify({ organizationId: "org_1", text: "refund", source: "test" });
  const signature = sign(payload, "test-secret");
  assert.equal(verify(payload, signature, "test-secret"), true);
});

test("invalid webhook signature is rejected", () => {
  const payload = JSON.stringify({ organizationId: "org_1", text: "refund", source: "test" });
  const signature = sign(payload, "wrong-secret");
  assert.equal(verify(payload, signature, "test-secret"), false);
});

test("missing webhook signature is rejected", () => {
  const payload = JSON.stringify({ organizationId: "org_1", text: "refund", source: "test" });
  assert.equal(verify(payload, null, "test-secret"), false);
});

test("signature changes when payload changes", () => {
  const original = JSON.stringify({ organizationId: "org_1", text: "refund", source: "test" });
  const signature = sign(original, "test-secret");
  const tampered = JSON.stringify({ organizationId: "org_1", text: "refund $9000", source: "test" });
  assert.equal(verify(tampered, signature, "test-secret"), false);
});
