import assert from "node:assert/strict";
import test from "node:test";
import { triageRequest } from "../lib/ai";

test("AI triage returns a validated fallback when OpenAI is not configured", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const result = await triageRequest("Customer cannot access their account");
    assert.equal(result.category, "support");
    assert.equal(result.priority, "normal");
    assert.equal(result.requiresApproval, false);
    assert.match(result.summary, /Customer cannot access/);
    assert.equal(result.suggestedAction, "Route to the support queue");
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("AI triage fallback preserves bounded summary length", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const result = await triageRequest("x".repeat(500));
    assert.equal(result.summary.length, 120);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
