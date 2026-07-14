import {
  DEFAULT_TIMEOUT_MS,
  type RequestOptions,
  SYNC_TIMEOUT_MS,
  type TrackerLookupOptions,
} from '../config.js';
import type { Transport } from '../transport.js';
import type { Tracker, Tracking } from '../types/domain.js';
import type {
  CreateTrackerRequest,
  ListTrackersParams,
  UpdateTrackerRequest,
} from '../types/requests.js';
import type { BulkCreateResult, ResendWebhooksResult, WebhookHistory } from '../types/responses.js';

/** Per-shipment tracker operations. */
export class TrackersResource {
  constructor(private readonly transport: Transport) {}

  /** Create a tracker. Idempotent by payload. */
  create(body: CreateTrackerRequest, opts?: RequestOptions): Promise<Tracker> {
    return this.transport.request(
      {
        method: 'POST',
        path: '/trackers',
        body,
        successCodes: [201],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { tracker: Tracker } }).data.tracker,
      },
      opts,
    );
  }

  /**
   * Create a tracker and return tracking results **synchronously**.
   * The first call may take up to ~60s (default timeout is 60 000ms).
   */
  track(body: CreateTrackerRequest, opts?: RequestOptions): Promise<Tracking[]> {
    return this.transport.request(
      {
        method: 'POST',
        path: '/trackers/track',
        body,
        // Spec documents 200; the API currently returns 201 — accept both.
        successCodes: [200, 201],
        defaultTimeoutMs: SYNC_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { trackings: Tracking[] } }).data.trackings,
      },
      opts,
    );
  }

  /**
   * Create up to 100 trackers in one request.
   *
   * This **never throws on the bulk envelope**: HTTP 201/207/400/403 all resolve
   * to a {@link BulkCreateResult} — inspect `status` and per-item `errors`. Only
   * envelope-less failures (auth, rate limit) reject.
   */
  bulkCreate(items: CreateTrackerRequest[], opts?: RequestOptions): Promise<BulkCreateResult> {
    return this.transport.request(
      {
        method: 'POST',
        path: '/trackers/bulk',
        body: items,
        successCodes: [201, 207],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        bulk: true,
        unwrap: (p) => p as BulkCreateResult,
      },
      opts,
    );
  }

  /** List trackers (page-based pagination). */
  list(params?: ListTrackersParams, opts?: RequestOptions): Promise<Tracker[]> {
    return this.transport.request(
      {
        method: 'GET',
        path: '/trackers',
        query: { page: params?.page, limit: params?.limit, sort: params?.sort },
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { trackers: Tracker[] } }).data.trackers,
      },
      opts,
    );
  }

  /** Get a tracker by `trackerId` (or `clientTrackerId` via `searchBy`). */
  get(trackerId: string, opts?: TrackerLookupOptions): Promise<Tracker> {
    return this.transport.request(
      {
        method: 'GET',
        path: `/trackers/${encodeURIComponent(trackerId)}`,
        query: { searchBy: opts?.searchBy },
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { tracker: Tracker } }).data.tracker,
      },
      opts,
    );
  }

  /** Update a tracker. Only some fields are patchable (see {@link UpdateTrackerRequest}). */
  update(
    trackerId: string,
    body: UpdateTrackerRequest,
    opts?: TrackerLookupOptions,
  ): Promise<Tracker> {
    return this.transport.request(
      {
        method: 'PATCH',
        path: `/trackers/${encodeURIComponent(trackerId)}`,
        body,
        query: { searchBy: opts?.searchBy },
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { tracker: Tracker } }).data.tracker,
      },
      opts,
    );
  }

  /** Get a tracker's results by id. Always returns exactly one {@link Tracking}. */
  getResults(trackerId: string, opts?: TrackerLookupOptions): Promise<Tracking[]> {
    return this.transport.request(
      {
        method: 'GET',
        path: `/trackers/${encodeURIComponent(trackerId)}/results`,
        query: { searchBy: opts?.searchBy },
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { trackings: Tracking[] } }).data.trackings,
      },
      opts,
    );
  }

  /**
   * Get results by tracking number. May return more than one {@link Tracking}.
   * The tracker(s) must already exist (otherwise the API returns 404).
   */
  getResultsByTrackingNumber(trackingNumber: string, opts?: RequestOptions): Promise<Tracking[]> {
    return this.transport.request(
      {
        method: 'GET',
        path: `/trackers/search/${encodeURIComponent(trackingNumber)}/results`,
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p) => (p as { data: { trackings: Tracking[] } }).data.trackings,
      },
      opts,
    );
  }

  /** Resend all webhook events for a tracker. Rate limited to 1/s. */
  resendWebhooks(trackerId: string, opts?: TrackerLookupOptions): Promise<ResendWebhooksResult> {
    return this.transport.request(
      {
        method: 'POST',
        path: `/trackers/${encodeURIComponent(trackerId)}/webhook-events/resend`,
        query: { searchBy: opts?.searchBy },
        successCodes: [201],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        // The API declares `totalResent` as string but returns an integer — coerce.
        unwrap: (p) => {
          const summary = (p as { data: { summary?: { totalResent?: unknown } } }).data.summary;
          return { totalResent: Number(summary?.totalResent ?? 0) };
        },
      },
      opts,
    );
  }

  /**
   * Download a tracker's webhook history (server returns a JSON file attachment).
   * Returns the parsed body plus the `filename` from `Content-Disposition`.
   * Rate limited to 1/s.
   */
  downloadWebhookHistory(trackerId: string, opts?: TrackerLookupOptions): Promise<WebhookHistory> {
    return this.transport.request(
      {
        method: 'GET',
        path: `/trackers/${encodeURIComponent(trackerId)}/webhook-history/download`,
        query: { searchBy: opts?.searchBy },
        successCodes: [200],
        defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
        unwrap: (p, res) => {
          const body = (p ?? {}) as Pick<WebhookHistory, 'metadata' | 'webhooks'>;
          return {
            metadata: body.metadata,
            webhooks: body.webhooks,
            filename: parseContentDispositionFilename(res.headers.get('content-disposition')),
          };
        },
      },
      opts,
    );
  }
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through to the plain form */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}
