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
  const raw = readFileSync(src, 'utf8');
  const doc = parse(preClean(raw));

  normalizeNullable(doc);
  fixTrackerByIdEnvelope(doc);
  dropJunkContentTypes(doc);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, stringify(doc), 'utf8');
  console.log(`Cleaned spec written to ${out}`);
}

/** Fix the malformed JSON-in-YAML webhook example (raw JSON keys + trailing commas). */
function preClean(raw: string): string {
  return raw
    .replace(/^(\s*)"hasNoTime":\s*false,\s*$/gm, '$1hasNoTime: false')
    .replace(/^(\s*)"utcOffset":\s*null,\s*$/gm, '$1utcOffset: null')
    .replace(/^(\s*)"datetime":\s*("[^"]*")\s*$/gm, '$1datetime: $2');
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

/** GET/PATCH /trackers/{trackerId} declare the bare `tracker` schema; wrap it in `data`. */
function fixTrackerByIdEnvelope(doc: any): void {
  const path = doc?.paths?.['/public/v1/trackers/{trackerId}'];
  for (const method of ['get', 'patch']) {
    const json = path?.[method]?.responses?.['200']?.content?.['application/json'];
    const ref: unknown = json?.schema?.$ref;
    if (typeof ref === 'string' && ref.endsWith('/tracker')) {
      json.schema = {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { tracker: { $ref: '#/components/schemas/tracker' } },
          },
        },
      };
    }
  }
}

/** Remove the spurious xml/form-data response variants on GET /trackers. */
function dropJunkContentTypes(doc: any): void {
  const content = doc?.paths?.['/public/v1/trackers']?.get?.responses?.['200']?.content;
  if (content) {
    delete content['application/xml'];
    delete content['multipart/form-data'];
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cleanSpec();
}
