# ship24

Official Node.js & TypeScript SDK for the [Ship24 Tracking API](https://docs.ship24.com/).

- **Typed** — full TypeScript types for every request and response, `strict` throughout.
- **Isomorphic & zero-dependency** — built on native `fetch`. Runs on Node 18+, Bun, Deno, Cloudflare Workers/edge, and modern browsers. No runtime dependencies.
- **Ergonomic** — `new Ship24({ apiKey })`, then `ship24.trackers.create({ trackingNumber })`.

> This SDK `1.0.0` targets the Ship24 Tracking API `/public/v1`. The SDK version is independent of the API version.

## Install

```bash
npm install ship24
# or: pnpm add ship24 / yarn add ship24 / bun add ship24
```

## Quickstart

```ts
import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY! });

const tracker = await ship24.trackers.create({ trackingNumber: '1234567890' });
console.log(tracker.trackerId);
```

## Authentication

Every request sends `Authorization: Bearer <apiKey>`. Create an API key in your
[Ship24 dashboard](https://www.ship24.com/) and pass it to the constructor. Never hard-code
keys — read them from the environment or a secret manager.

## Which product am I on?

Ship24 sells two tracking products on two billing models. This SDK keeps them **separate and
unmistakable**:

| | Per-shipment (default, recommended) | Per-call |
|---|---|---|
| Namespaces | `ship24.trackers.*`, `ship24.couriers.*` | `ship24.perCall.*` |
| Model | Create a tracker; Ship24 tracks asynchronously, pushes webhooks, results fetchable any time | One synchronous track-by-number call, billed per API call |
| Subscription | Per-shipment plan | **Separate active "Per-call" subscription** |
| Return type | `Tracking` (has `.tracker`) | `PerCallTracking` (**no** `.tracker`) |

```ts
// Per-shipment (default, recommended)
const [tracking] = await ship24.trackers.track({ trackingNumber: '1234567890' });
tracking.tracker; // ✅

// Per-call (separate subscription, billed per call)
const [result] = await ship24.perCall.track({ trackingNumber: '1234567890' });
result.tracker; // ❌ type error — PerCallTracking has no tracker
```

Calling `perCall.track` without a Per-call subscription throws a `SubscriptionError` (HTTP 422)
with an actionable message.

## Usage

Per-shipment (`ship24.trackers`):

| Method | Endpoint |
|---|---|
| `create(body, opts?)` | `POST /trackers` |
| `track(body, opts?)` | `POST /trackers/track` — synchronous, ~60s |
| `bulkCreate(items, opts?)` | `POST /trackers/bulk` — up to 100; returns an envelope, never throws on it |
| `list(params?, opts?)` | `GET /trackers` |
| `get(trackerId, opts?)` | `GET /trackers/{id}` |
| `update(trackerId, body, opts?)` | `PATCH /trackers/{id}` |
| `getResults(trackerId, opts?)` | `GET /trackers/{id}/results` |
| `getResultsByTrackingNumber(tn, opts?)` | `GET /trackers/search/{tn}/results` |
| `resendWebhooks(trackerId, opts?)` | `POST /trackers/{id}/webhook-events/resend` |
| `downloadWebhookHistory(trackerId, opts?)` | `GET /trackers/{id}/webhook-history/download` |

Couriers: `ship24.couriers.list(opts?)` → `GET /couriers`.

Per-call: `ship24.perCall.track(body, opts?)` → `POST /tracking/search`.

Runnable snippets for each are in [`examples/`](./examples).

`searchBy` — methods that take a `trackerId` accept `{ searchBy: 'clientTrackerId' }` to resolve
the id as your own client id instead:

```ts
const tracker = await ship24.trackers.get('order-4242', { searchBy: 'clientTrackerId' });
```

### Bulk results

`bulkCreate` **never throws on the bulk envelope** — HTTP 201/207/400/403 all resolve to a
`BulkCreateResult`. Inspect `status` and per-item `itemStatus`/`errors`; only auth/rate-limit
failures reject.

```ts
const result = await ship24.trackers.bulkCreate([{ trackingNumber: 'A' }, { trackingNumber: 'B' }]);
if (result.status !== 'success') {
  for (const item of result.data ?? []) {
    if (item.itemStatus === 'error') console.error(item.inputData.trackingNumber, item.errors);
  }
}
```

## Error handling

All errors extend `Ship24Error`. HTTP error responses are `Ship24APIError` (carrying `httpStatus`,
`errors`, `code`, and `requestId`) with these subclasses:

| Class | When |
|---|---|
| `AuthenticationError` | `auth_*` (400/401) |
| `InvalidRequestError` (alias `ValidationError`) | 400 validation / immutable field / malformed |
| `NotFoundError` | 404 `tracker_not_found`, `parcel_not_found` |
| `ConflictError` | `request_conflict` (409), `tracker_conflict` (400) |
| `RateLimitError` | 429 — exposes `retryAfter` (seconds) and `rateLimit` (IETF headers) |
| `QuotaError` | `quota_limit_reached` (403/405), `bulk_create_limit_exceeded` (403) |
| `SubscriptionError` | `no_active_subscription` (422) — actionable per-call message |
| `ServerError` | 5xx |

Transport failures (no HTTP response): `Ship24ConnectionError` and `Ship24TimeoutError`.

```ts
import { NotFoundError, RateLimitError } from 'ship24';

try {
  await ship24.trackers.get('unknown');
} catch (err) {
  if (err instanceof NotFoundError) console.error(err.code, err.requestId);
  else if (err instanceof RateLimitError) console.error(`retry after ${err.retryAfter}s`);
  else throw err;
}
```

## Configuration

```ts
new Ship24({
  apiKey: '...',            // required
  baseUrl: '...',           // override the API origin; default 'https://api.ship24.com'
  timeoutMs: 10_000,        // default; track/perCall.track default to 60_000
  fetch: customFetch,       // default globalThis.fetch
  headers: { 'X-App': '1' },// extra default headers (cannot override Authorization)
});
```

Per-call options on every method: `{ timeoutMs?, signal?, headers? }` (plus `searchBy?` on
tracker-id methods). Note `trackers.track` and `perCall.track` are synchronous and may take up to
~60s — they default to a 60 000ms timeout; override with `timeoutMs`.

## Supported runtimes

Node 18+ (native `fetch`), Bun, Deno, Cloudflare Workers/edge, and modern browsers. CI tests
against Node 20/22/24, latest Bun, and latest Deno.

## Contributing / regenerating types

Types for the core objects are hand-written (the source of truth). The OpenAPI spec is **vendored**
at `spec/ship24-tracking-api.yaml` and used as a **drift reference**:

```bash
npm run generate   # clean the vendored spec → openapi-typescript → src/generated/schema.d.ts
```

`npm run generate` never fetches the spec over the network. A scheduled CI job diffs the canonical
spec URL against the vendored copy and opens a PR when they differ — regeneration is always a
reviewed step.

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run check:exports
```

## License

[MIT](./LICENSE) © Ship24
