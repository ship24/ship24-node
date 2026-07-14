import { execFileSync } from 'node:child_process';
import { cleanSpec } from './clean-spec.js';

// 1. Clean the vendored raw spec into build/clean-spec.yaml.
cleanSpec();

// 2. Emit types-only .d.ts (zero runtime) from the cleaned spec.
execFileSync(
  'npx',
  ['openapi-typescript', 'build/clean-spec.yaml', '-o', 'src/generated/schema.d.ts'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

console.log('Wrote src/generated/schema.d.ts');
