import type { Tracker } from './domain.js';
import type { CreateTrackerRequest } from './requests.js';

/** A single `{ code, message }` error item from the API. */
export interface ApiErrorItem {
  code: string;
  message: string;
}

export interface BulkCreateItem {
  itemStatus: 'created' | 'existing' | 'error';
  inputData: CreateTrackerRequest;
  tracker: Tracker | null;
  errors: ApiErrorItem[] | null;
}

/**
 * Result of `trackers.bulkCreate`. This is always returned (never thrown) for
 * HTTP 201/207/400/403 — inspect `status` and per-item `itemStatus`/`errors`.
 */
export interface BulkCreateResult {
  status: 'success' | 'partial' | 'error';
  summary: {
    totalInputs: number;
    totalCreated: number;
    totalExisting: number;
    totalErrors: number;
  } | null;
  data: BulkCreateItem[] | null;
  error: ApiErrorItem | null;
}

/** Result of `trackers.resendWebhooks`. */
export interface ResendWebhooksResult {
  totalResent: number;
}

export interface WebhookHistoryEntry {
  status: 'success' | 'failed';
  pushTimestamp: string | null;
  requestBody: unknown;
  responseBody: unknown;
  responseHeaders: Record<string, unknown>;
  responseStatusCode: string | null;
}

/** Result of `trackers.downloadWebhookHistory`. */
export interface WebhookHistory {
  metadata: {
    trackingNumber: string;
    trackerId: string;
    clientTrackerId: string | null;
    webhookUrl: string | null;
    lastSuccessfulPushAt: string | null;
    lastFailedPushAt: string | null;
  };
  webhooks: WebhookHistoryEntry[];
  /** Parsed from the `Content-Disposition` header; `null` if absent. */
  filename: string | null;
}
