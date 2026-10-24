import { planCutover } from "../src/template_cutover";

const sample = {
  kind: "deadline_follow_up",
  matterRef: "MAT-2041",
  clientName: "Jordan Lee",
  dueDateIso: "2026-11-04",
  daysUntilDue: 2,
  actionUrl: "https://legal.example.com/matters/MAT-2041/checklist"
};

const plan = planCutover(sample, "v2026_11");
console.log(JSON.stringify(plan, null, 2));
