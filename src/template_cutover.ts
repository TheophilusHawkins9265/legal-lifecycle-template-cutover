import { createHash, randomUUID } from "node:crypto";
import { infrai } from "./infrai";
import { lifecycleRequestSchema, renderLifecycleTemplate, type LifecycleRequest, type TemplatePlan } from "./legal_templates";

export type CutoverApplyResult = {
  templateName: string;
  subject: string;
  rolloutState: "candidate" | "active";
  providerTemplateId: string;
};

export type DeleteResult = {
  templateId: string;
  deleted: boolean;
};

function stableKey(plan: TemplatePlan): string {
  const digest = createHash("sha256")
    .update(JSON.stringify({
      templateName: plan.templateName,
      subject: plan.subject,
      html: plan.html,
      rolloutState: plan.rolloutState,
    }))
    .digest("hex");
  return `tmpl-${digest}`;
}

export function planCutover(input: unknown, version: string): TemplatePlan {
  const parsed = lifecycleRequestSchema.parse(input);
  return renderLifecycleTemplate(parsed, version);
}

export async function applyCutover(input: unknown, version: string): Promise<CutoverApplyResult> {
  const parsed: LifecycleRequest = lifecycleRequestSchema.parse(input);
  const plan = renderLifecycleTemplate(parsed, version);
  const idempotencyKey = stableKey(plan);

  const createReply = await infrai.email.template.create(
    {
      name: plan.templateName,
      subject: plan.subject,
      html: plan.html,
    },
    {
      "Idempotency-Key": idempotencyKey,
      "X-Run-Id": randomUUID(),
    },
  );

  const providerTemplateId = String((createReply.data as Record<string, unknown>).id ?? plan.templateName);

  return {
    templateName: plan.templateName,
    subject: plan.subject,
    rolloutState: plan.rolloutState,
    providerTemplateId,
  };
}

export async function rollbackTemplate(templateId: string): Promise<DeleteResult> {
  await infrai.email.template.delete(templateId, {
    "X-Run-Id": randomUUID(),
  });

  return {
    templateId,
    deleted: true,
  };
}
