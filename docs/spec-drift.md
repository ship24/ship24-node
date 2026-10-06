# Handling spec drift

The SDK's public types are hand-written. The Ship24 OpenAPI spec is vendored only as a reference,
so when Ship24 changes the API nothing in this repo updates by itself. This page is the procedure
for catching up.

## How drift is detected

`.github/workflows/spec-drift.yml` runs every Monday at 06:00 UTC, or on demand from the Actions
tab. It downloads the canonical spec and diffs it against `spec/ship24-tracking-api.yaml`. When
they differ, it opens a single issue labeled `spec-drift` that contains the raw diff. If that issue
is already open, it only updates the description and comments when the canonical spec has changed
again. It never commits, pushes, or opens a PR.

To get notified, watch the repo with **Custom → Issues** enabled.

## Files involved

| File | Role |
| --- | --- |
| `spec/ship24-tracking-api.yaml` | Exact copy of the canonical spec. Never edit it by hand: the weekly diff depends on it being raw. |
| `scripts/clean-spec.ts` | Patches known bugs in the spec before generation. Writes `build/clean-spec.yaml` (gitignored). |
| `src/generated/schema.d.ts` | Generated from the cleaned spec. Reference only: nothing imports it and it is not shipped. |
| `src/types/*` | Hand-written public types, the source of truth for SDK users. |
| `src/resources/*` | Resource methods (`trackers`, `couriers`, `perCall`). |

## Fixing drift

The spec, the regenerated reference, and the code changes all go in one PR.

1. Branch from `main` and vendor the new spec:

   ```bash
   git switch -c chore/sync-spec main
   curl -fsSL https://docs.ship24.com/assets/openapi/ship24-tracking-api.yaml \
     -o spec/ship24-tracking-api.yaml
   ```

2. Regenerate the reference types and read their diff, which is easier to follow than the YAML one:

   ```bash
   pnpm generate
   git diff src/generated/schema.d.ts
   ```

   If `pnpm generate` fails or the output looks wrong, the spec probably changed in a spot that
   `scripts/clean-spec.ts` patches (the webhook example, the `/trackers/{trackerId}` envelope, the
   `GET /trackers` content types). Ship24 may have fixed the bug upstream, so adjust or delete that patch.

3. Classify every change using the table below.

4. Update `src/types/*` and `src/resources/*`, and cover new or changed behavior in `test/`
   (shared fixtures are in `test/fixtures.ts`).

5. Run the full check:

   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm check:exports
   ```

6. If the public surface changed, run `pnpm changeset`.

7. Open the PR with `Closes #<issue>` in the description.

### What to do per change

| Change in the spec | SDK action | Changeset |
| --- | --- | --- |
| Descriptions, examples, formatting only | Commit the spec and `schema.d.ts` | none |
| New enum value | Usually nothing: enum-like fields (`statusMilestone`, `statusCode`, ...) are typed as `string` | none |
| New optional response field | Add it to `src/types/*` | minor |
| New endpoint or new optional request parameter | Add it to the types and the resource, with tests | minor |
| Response field removed, renamed, or retyped | Breaks SDK users either way; agree on the approach before merging | major |
| Request parameter removed or made required | Same as above | major |
| Spec contradicts what the API actually returns | Confirm with `scripts/live-smoke.mjs` (hits production, see its header), then patch `clean-spec.ts` if the spec is wrong | depends |

## Doing it with Claude

Point Claude at this file and keep the classification step human-reviewed:

```text
Read docs/spec-drift.md and fix the drift reported in issue #<n>.
Stop after step 3 and show me the classification before changing any code.
```

## When the workflow itself fails

A red run means detection broke, not that drift was found. Usually the spec URL moved (update
`SPEC_URL` in the workflow) or the token lacks `issues: write`. Failure emails for scheduled
workflows only go to whoever last edited the cron line, so check the Actions tab now and then.
