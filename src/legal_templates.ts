import { z } from "zod";

export const lifecycleKinds = ["matter_intake", "signed_document_delivery", "deadline_follow_up"] as const;
export type LifecycleKind = (typeof lifecycleKinds)[number];

const matterIntakeSchema = z.object({
  kind: z.literal("matter_intake"),
  matterType: z.string().min(1),
  clientName: z.string().min(1),
  portalUrl: z.string().url(),
  intakeId: z.string().min(1),
});

const signedDocumentDeliverySchema = z.object({
  kind: z.literal("signed_document_delivery"),
  matterRef: z.string().min(1),
  clientName: z.string().min(1),
  documentTitle: z.string().min(1),
  signedAtIso: z.string().min(1),
  downloadUrl: z.string().url(),
});

const deadlineFollowUpSchema = z.object({
  kind: z.literal("deadline_follow_up"),
  matterRef: z.string().min(1),
  clientName: z.string().min(1),
  dueDateIso: z.string().min(1),
  daysUntilDue: z.number().int(),
  actionUrl: z.string().url(),
});

export const lifecycleRequestSchema = z.discriminatedUnion("kind", [
  matterIntakeSchema,
  signedDocumentDeliverySchema,
  deadlineFollowUpSchema,
]);

export type LifecycleRequest = z.infer<typeof lifecycleRequestSchema>;

export type TemplatePlan = {
  templateName: string;
  subject: string;
  html: string;
  rolloutState: "candidate" | "active";
};

export function chooseRolloutState(input: LifecycleRequest): "candidate" | "active" {
  if (input.kind === "deadline_follow_up" && input.daysUntilDue <= 3) return "active";
  return "candidate";
}

export function templateNameFor(input: LifecycleRequest, version: string): string {
  return `legaltech.${input.kind}.${version}`;
}

export function renderLifecycleTemplate(input: LifecycleRequest, version: string): TemplatePlan {
  const rolloutState = chooseRolloutState(input);

  switch (input.kind) {
    case "matter_intake":
      return {
        templateName: templateNameFor(input, version),
        rolloutState,
        subject: `We opened your ${input.matterType} matter`,
        html: [
          `<h1>Matter intake confirmed</h1>`,
          `<p>Hello ${input.clientName},</p>`,
          `<p>Your ${input.matterType} matter is open. Intake reference: <b>${input.intakeId}</b>.</p>`,
          `<p>Upload any remaining documents here: <a href="${input.portalUrl}">${input.portalUrl}</a></p>`,
        ].join(""),
      };
    case "signed_document_delivery":
      return {
        templateName: templateNameFor(input, version),
        rolloutState,
        subject: `Signed document ready: ${input.documentTitle}`,
        html: [
          `<h1>Signed document delivered</h1>`,
          `<p>Hello ${input.clientName},</p>`,
          `<p>We filed the signed document for matter <b>${input.matterRef}</b> on ${input.signedAtIso}.</p>`,
          `<p>Download: <a href="${input.downloadUrl}">${input.documentTitle}</a></p>`,
        ].join(""),
      };
    case "deadline_follow_up":
      return {
        templateName: templateNameFor(input, version),
        rolloutState,
        subject: `Action needed by ${input.dueDateIso}`,
        html: [
          `<h1>Deadline follow-up</h1>`,
          `<p>Hello ${input.clientName},</p>`,
          `<p>Your next matter deadline for <b>${input.matterRef}</b> is in ${input.daysUntilDue} day(s), due ${input.dueDateIso}.</p>`,
          `<p>Open the checklist: <a href="${input.actionUrl}">${input.actionUrl}</a></p>`,
        ].join(""),
      };
  }
}
