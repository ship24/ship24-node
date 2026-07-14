/**
 * Live smoke test against the production Ship24 API. Run manually, NEVER in CI.
 *
 *   npm run build
 *   SHIP24_API_KEY=... node scripts/live-smoke.mjs
 *
 * ⚠ Creates real trackers (there is no delete endpoint) and consumes plan quota —
 * use a dedicated test account. The `track` step takes up to ~60s.
 */
import { Ship24, SubscriptionError } from '../dist/index.js';

const apiKey = process.env.SHIP24_API_KEY;
if (!apiKey) {
  console.error('SHIP24_API_KEY is required. Aborting — this script hits the production API.');
  process.exit(1);
}

const ship24 = new Ship24({ apiKey });
const runId = `SDK-SMOKE-${Date.now()}`;
const failures = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function step(name, fn) {
  process.stdout.write(`• ${name} ... `);
  try {
    const value = await fn();
    console.log('ok');
    return value;
  } catch (err) {
    console.log(`FAIL — ${err.constructor.name}: ${err.message}`);
    if (err.requestId) console.log(`    requestId: ${err.requestId}`);
    failures.push(name);
    return undefined;
  } finally {
    await sleep(1200); // stay under the strictest (1/s) endpoint rate limits
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

console.log(`Live smoke run ${runId} against https://api.ship24.com\n`);

await step('couriers.list returns a non-empty catalog', async () => {
  const couriers = await ship24.couriers.list();
  assert(Array.isArray(couriers) && couriers.length > 0, 'expected couriers');
  assert(typeof couriers[0].courierCode === 'string', 'courierCode is a string');
});

const created = await step('trackers.create returns a tracker', async () => {
  const tracker = await ship24.trackers.create({
    trackingNumber: `${runId}-A`,
    clientTrackerId: `${runId.toLowerCase()}-a`,
  });
  assert(typeof tracker.trackerId === 'string', 'trackerId present');
  assert(tracker.trackingNumber === `${runId}-A`, 'trackingNumber echoed');
  return tracker;
});

if (created) {
  await step('trackers.get by trackerId', async () => {
    const tracker = await ship24.trackers.get(created.trackerId);
    assert(tracker.trackerId === created.trackerId, 'same tracker returned');
  });

  await step('trackers.get by clientTrackerId (searchBy)', async () => {
    const tracker = await ship24.trackers.get(created.clientTrackerId, {
      searchBy: 'clientTrackerId',
    });
    assert(tracker.trackerId === created.trackerId, 'resolved via clientTrackerId');
  });

  await step('trackers.getResults returns one tracking', async () => {
    const trackings = await ship24.trackers.getResults(created.trackerId);
    assert(trackings.length === 1, 'exactly one tracking');
    assert(trackings[0].tracker.trackerId === created.trackerId, 'tracker attached');
    assert(typeof trackings[0].shipment.statusMilestone === 'string', 'shipment present');
  });
}

await step('trackers.list returns a page', async () => {
  const trackers = await ship24.trackers.list({ limit: 5 });
  assert(Array.isArray(trackers), 'array returned');
});

await step('trackers.track (synchronous, may take up to ~60s)', async () => {
  const trackings = await ship24.trackers.track({ trackingNumber: `${runId}-B` });
  assert(trackings.length >= 1, 'at least one tracking');
  assert(trackings[0].tracker !== undefined, 'per-shipment result has a tracker');
});

await step('perCall.track succeeds or throws an actionable SubscriptionError', async () => {
  try {
    const trackings = await ship24.perCall.track({ trackingNumber: `${runId}-C` });
    assert(trackings.length >= 1, 'at least one tracking');
    assert(trackings[0].tracker === undefined, 'per-call result has no tracker');
    console.log('\n    (account has an active Per-call subscription)');
  } catch (err) {
    if (!(err instanceof SubscriptionError)) throw err;
    assert(/per-call/i.test(err.message), 'message mentions the per-call product');
    console.log('\n    (no Per-call subscription — SubscriptionError message verified)');
  }
});

console.log(
  failures.length === 0
    ? '\nAll live smoke steps passed.'
    : `\n${failures.length} step(s) FAILED: ${failures.join(', ')}`,
);
process.exit(failures.length === 0 ? 0 : 1);
