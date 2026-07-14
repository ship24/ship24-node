import { type Ship24Config, resolveConfig } from './config.js';
import { CouriersResource } from './resources/couriers.js';
import { PerCallResource } from './resources/perCall.js';
import { TrackersResource } from './resources/trackers.js';
import { Transport } from './transport.js';

/**
 * The Ship24 Tracking API client.
 *
 * ```ts
 * import { Ship24 } from 'ship24';
 * const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY! });
 * const tracker = await ship24.trackers.create({ trackingNumber: '1234567890' });
 * ```
 *
 * Two products, deliberately separated:
 * - `trackers.*` + `couriers.*` — the **per-shipment** product (default, recommended).
 * - `perCall.*` — the **per-call** product (requires a separate Per-call subscription).
 */
export class Ship24 {
  /** Per-shipment tracker operations. */
  readonly trackers: TrackersResource;
  /** Courier list operations. */
  readonly couriers: CouriersResource;
  /** ⚠ Per-call product — requires a separate active Per-call subscription. */
  readonly perCall: PerCallResource;

  constructor(config: Ship24Config) {
    const resolved = resolveConfig(config);
    const transport = new Transport(resolved);
    this.trackers = new TrackersResource(transport);
    this.couriers = new CouriersResource(transport);
    this.perCall = new PerCallResource(transport);
  }
}
