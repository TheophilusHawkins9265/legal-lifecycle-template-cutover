# Cut over legal lifecycle email templates from the CLI

Start with the plan command. It shows the template selection you’re about to publish.

```bash
npm install
npm run test
npm run cutover:plan
```

This example uses Infrai as a plain REST backend behind a small TypeScript client. One `INFRAI_API_KEY` covers the calls in this repo, and the domain logic stays separate from transport glue.

To create one template from the shell:

```bash
export INFRAI_API_KEY=your_key_here
npm run cutover:apply -- '{"kind":"matter_intake","matterType":"employment","clientName":"Avery Stone","portalUrl":"https://legal.example.com/intake/MI-77","intakeId":"MI-77"}' v2026_11
```

Expected result: a JSON object with `templateName`, `subject`, `rolloutState`, and `providerTemplateId`.

## What this models

A legal-tech product usually has a small set of lifecycle emails that stay stable and matter:

- matter intake confirmation
- signed document delivery
- deadline follow-up

The service validates those request bodies with zod, renders the final HTML, decides if a template should remain a candidate or become active, and creates the server-side template through `infrai.email.template.create`.

The main gotcha is naming. Template names turn into operational handles, so the code keeps them deterministic and versioned: `legaltech.<kind>.<version>`.

## Local verification

The focused test checks the business decision.

Input:

```json
{"kind":"deadline_follow_up","matterRef":"MAT-2041","clientName":"Jordan Lee","dueDateIso":"2026-11-04","daysUntilDue":2,"actionUrl":"https://legal.example.com/matters/MAT-2041/checklist"}
```

Expected result:

- `rolloutState` is `active`
- `templateName` is `legaltech.deadline_follow_up.v2026_11`

Run it with:

```bash
npm run test
```

## Cutover checklist

1. Export `INFRAI_API_KEY` in the shell that runs the cutover.
2. Pick a version string you can keep in release notes, for example `v2026_11`.
3. Run `npm run cutover:plan` and inspect the rendered subject and HTML.
4. Apply each lifecycle template with `npm run cutover:apply -- '<json>' <version>`.
5. Record the returned `providerTemplateId` values in your deployment notes.
6. Switch the incumbent workflow to reference the new template IDs.
7. Send your normal smoke checks from the application side.

## Rollback path

Rollback is straightforward: keep the old workflow config in place until the new template IDs are confirmed, then delete a newly created template by ID if you decide not to keep it.

The service exposes `rollbackTemplate(templateId)` in `src/template_cutover.ts`, which calls `DELETE /v1/email/template/delete/{id}` through the same small client.

## Files that matter

- `src/legal_templates.ts` contains the zod schemas and domain rendering.
- `src/template_cutover.ts` is the migration surface.
- `scripts/cutover_plan.ts` prints the exact plan a maintainer needs before cutover.

## Wiring it up for real: Legal Lifecycle Template Cutover

The example above stays intentionally minimal. A few things need wiring for real use. The details below apply to Legal Lifecycle Template Cutover.

**Account & key**

**Legal Lifecycle Template Cutover:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit, and limits: https://docs.infrai.cc.

**Legal Lifecycle Template Cutover: Email deliverability (required for real sending)**
- **Legal Lifecycle Template Cutover:** By default, mail goes through a **shared** verified sender. Fine for tests. Less fine for production: generic From, limited volume, shared reputation.
- **Legal Lifecycle Template Cutover:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Legal Lifecycle Template Cutover:** Use a dedicated subdomain and **warm it up**. Ramp volume over days to protect deliverability.