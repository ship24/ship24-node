// Cross-runtime smoke test: import the built ESM bundle, construct a client with a
// stub fetch, and exercise one call. Run under Node, Bun, and Deno to prove the
// package is isomorphic. Usage: `node|bun|deno run scripts/smoke.mjs`.
import { Ship24 } from '../dist/index.js';

const stubFetch = async () =>
  new Response(JSON.stringify({ data: { couriers: [] } }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const ship24 = new Ship24({ apiKey: 'smoke-test', fetch: stubFetch });
const couriers = await ship24.couriers.list();

if (!Array.isArray(couriers)) {
  throw new Error('smoke failed: expected an array of couriers');
}
console.log('smoke ok — couriers.list returned an array');
