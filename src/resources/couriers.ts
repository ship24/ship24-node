import { DEFAULT_TIMEOUT_MS, type RequestOptions } from '../config.js';
import type { Transport } from '../transport.js';
import type { Courier } from '../types/domain.js';

/** Courier operations. */
export class CouriersResource {
  constructor(private readonly transport: Transport) {}

  /** List all supported couriers. Rate limited to 1/s. */
  list(opts?: RequestOptions): Promise<Courier[]> {
    return this.transport.request(
      {
        method: 'GET',
        path: '/couriers',
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { couriers: Courier[] } }).data.couriers,
      },
      opts,
    );
  }
}
