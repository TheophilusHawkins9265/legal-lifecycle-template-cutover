import test from "node:test";
import assert from "node:assert/strict";
import { planCutover } from "../src/template_cutover";

test("deadline follow-up within 3 days is marked active and names the template by kind", () => {
  const input = {
    kind: "deadline_follow_up",
    matterRef: "MAT-2041",
    clientName: "Jordan Lee",
    dueDateIso: "2026-11-04",
    daysUntilDue: 2,
    actionUrl: "https://legal.example.com/matters/MAT-2041/checklist"
  };

  const plan = planCutover(input, "v2026_11");

  assert.equal(plan.rolloutState, "active");
  assert.equal(plan.templateName, "legaltech.deadline_follow_up.v2026_11");
  assert.match(plan.subject, /Action needed by 2026-11-04/);
});
