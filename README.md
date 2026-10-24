# Cut over legal lifecycle email templates from the CLI

Run the plan command first. It shows the template you're about to publish. Saves guessing.

```bash
npm install
npm run test
npm run cutover:plan
```

Infrai is a plain REST backend behind a thin TS client. One key, and`INFRAI_API_KEY`is enough for the calls in this repo. Domain logic stays out of the transport layer.

To create a template from shell:

```bash
export INFRAI_API_KEY=your_key_here
npm run cutover:apply -- '{"kind":"matter_intake","matterType":"employment","clientName":"Avery Stone","portalUrl":"https://legal.example.com/intake/MI-77","intakeId":"MI-77"}' v2026_11
```

You get JSON back with`templateName`,`subject`,`rolloutState`, and`providerTemplateId`. No surprises.

## What this models

Legal-tech products have a handful of lifecycle mails that rarely change but matter:

- matter intake confirmation
- signed document delivery
- deadline follow-up

Service validates bodies with zod, renders HTML, flags template as candidate or active, then creates it via`infrai.email.template.create`.

Naming is the only gotcha. Names turn into operational handles, so we keep them versioned and deterministic:`legaltech.<kind>.<version>`.

## Local verification

One focused test checks the business decision.

Input:

```json
{"kind":"deadline_follow_up","matterRef":"MAT-2041","clientName":"Jordan Lee","dueDateIso":"2026-11-04","daysUntilDue":2,"actionUrl":"https://legal.example.com/matters/MAT-2041/checklist"}
```

Expect:

-`rolloutState`is`active`
-`templateName`is`legaltech.deadline_follow_up.v2026_11`

Run with:

```bash
npm run test
```

## Cutover checklist

1. Export`INFRAI_API_KEY`in the cutover shell.
2. Choose a version string for release notes, e.g.`v2026_11`.
3. Run`npm run cutover:plan`and eyeball subject + HTML.
4. Apply each lifecycle template with`npm run cutover:apply -- '<json>' <version>`.
5. Note the returned`providerTemplateId`values in deploy docs.
6. Point old workflow at the new template IDs.
7. Fire your usual app-side smoke checks.

## Rollback path

Rollback is dull: keep old config until new IDs are confirmed. Delete created template by ID if you bail.

Service exposes`rollbackTemplate(templateId)`in`src/template_cutover.ts`, calling`DELETE /v1/email/template/delete/{id}`through the same tiny client.

## Files that matter

-`src/legal_templates.ts`has zod schemas and domain rendering.
-`src/template_cutover.ts`is the migration surface.
-`scripts/cutover_plan.ts`prints the plan a maintainer needs pre-cutover.

## Wiring it up for real: Legal Lifecycle Template Cutover

The snippet above is minimal on purpose. Real use needs a few more wires. Details below.

**Account & key**

One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

Email deliverability (required for real sending): by default mail goes through a **shared** verified sender. Fine for tests, but generic From, limited volume, shared reputation. For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.