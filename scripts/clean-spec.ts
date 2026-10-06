import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const SRC = resolve('spec/ship24-tracking-api.yaml');
const OUT = resolve('build/clean-spec.yaml');

/**
 * Applies a small, reviewed set of fixes to the vendored raw spec so that
 * `openapi-typescript` produces correct, strict types. The vendored file
 * (spec/ship24-tracking-api.yaml) is NEVER modified — output goes to build/,
 * which keeps the scheduled spec-drift diff honest (raw canonical vs raw vendored).
 */
export function cleanSpec(src: string = SRC, out: string = OUT): void {
  const doc = parse(readFileSync(src, 'utf8'));

  normalizeNullable(doc);
  fixTrackerByIdEnvelope(doc);
  dropJunkContentTypes(doc);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, stringify(doc), 'utf8');
  console.log(`Cleaned spec written to ${out}`);
}

/** Fails generation when a targeted fix no longer matches, instead of silently emitting wrong types. */
function assertApplies(applies: boolean, fix: string): void {
  if (!applies) {
    throw new Error(
      `clean-spec: ${fix} no longer matches the spec. Ship24 may have fixed it upstream; update or remove it in scripts/clean-spec.ts.`,
    );
  }
}

/** OAS 3.0 `nullable: true` → OAS 3.1 `type: [..., "null"]` unions (e.g. `event.status`). */
function normalizeNullable(node: any): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) normalizeNullable(item);
    return;
  }
  if (node.nullable === true && node.type !== undefined) {
    if (typeof node.type === 'string') node.type = [node.type, 'null'];
    else if (Array.isArray(node.type) && !node.type.includes('null')) node.type.push('null');
    delete node.nullable;
  }
  for (const key of Object.keys(node)) normalizeNullable(node[key]);
}

/**
 * GET/PATCH /trackers/{trackerId} declare the bare `tracker` schema (PATCH extends it via
 * `allOf`); wrap it in `data`.
 */
function fixTrackerByIdEnvelope(doc: any): void {
  const path = doc?.paths?.['/public/v1/trackers/{trackerId}'];
  for (const method of ['get', 'patch']) {
    const json = path?.[method]?.responses?.['200']?.content?.['application/json'];
    const schema = json?.schema;
    const ref: unknown = schema?.$ref ?? schema?.allOf?.[0]?.$ref;
    assertApplies(
      typeof ref === 'string' && ref.endsWith('/tracker'),
      `fixTrackerByIdEnvelope (${method.toUpperCase()})`,
    );
    json.schema = {
      type: 'object',
      properties: { data: { type: 'object', properties: { tracker: schema } } },
    };
  }
}

/** Remove the spurious xml/form-data response variants on GET /trackers. */
function dropJunkContentTypes(doc: any): void {
  const content = doc?.paths?.['/public/v1/trackers']?.get?.responses?.['200']?.content;
  for (const type of ['application/xml', 'multipart/form-data']) {
    assertApplies(content?.[type] !== undefined, `dropJunkContentTypes (${type})`);
    delete content[type];
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cleanSpec();
}
