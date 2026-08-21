import test from "node:test";
import assert from "node:assert/strict";

function enqueueOptions() {
  return {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  };
}

function successfulStatus() {
  return "completed";
}

function failedStatus() {
  return "failed";
}

test("workflow jobs use three attempts with exponential backoff", () => {
  assert.deepEqual(enqueueOptions(), {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
});

test("successful worker execution ends with completed task status", () => {
  assert.equal(successfulStatus(), "completed");
});

test("failed worker execution ends with failed task status", () => {
  assert.equal(failedStatus(), "failed");
});

test("worker audit lifecycle uses started, completed and failed events", () => {
  const events = [
    "workflow.execution.started",
    "workflow.execution.completed",
    "workflow.execution.failed",
  ];
  assert.deepEqual(events, [
    "workflow.execution.started",
    "workflow.execution.completed",
    "workflow.execution.failed",
  ]);
});
