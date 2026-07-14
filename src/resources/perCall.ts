import { type RequestOptions, SYNC_TIMEOUT_MS } from '../config.js';
import type { Transport } from '../transport.js';
import type { PerCallTracking } from '../types/domain.js';
import type { PerCallTrackRequest } from '../types/requests.js';

/**
 * ⚠ **Per-call product only — requires a separate active Per-call subscription.**
 *
 * The per-call product is billed per API call and tracks synchronously. Most
 * customers should use the per-shipment product (`ship24.trackers.*`) instead:
 * it is cheaper per shipment, has more features, and depends less on courier uptime.
 */
export class PerCallResource {
  constructor(private readonly transport: Transport) {}

  /**
   * ⚠ **Per-call product only — requires a separate active Per-call subscription.**
   *
   * Track by number **synchronously**, billed per call; may take up to ~60s
   * (default timeout is 60 000ms). Returns {@link PerCallTracking}[] — note these
   * items have **no `tracker`** field (unlike `trackers.track`).
   *
   * @throws {SubscriptionError} `no_active_subscription` (422) when the account has no Per-call plan.
   */
  track(body: PerCallTrackRequest, opts?: RequestOptions): Promise<PerCallTracking[]> {
    return this.transport.request(
      {
        method: 'POST',
        path: '/tracking/search',
        body,
        successCodes: [201],
        defaultTimeoutMs: SYNC_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { trackings: PerCallTracking[] } }).data.trackings,
      },
      opts,
    );
  }
}
