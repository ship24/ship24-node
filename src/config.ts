import { Ship24Error } from './errors.js';

/** Configuration for a {@link Ship24} client. */
export interface Ship24Config {
  /** Ship24 API key. Sent as `Authorization: Bearer <apiKey>` on every request. */
  apiKey: string;
  /**
   * Override the API origin. Defaults to `https://api.ship24.com`.
   */
  baseUrl?: string;
  /**
   * Default per-request timeout in milliseconds. Defaults to 10 000.
   * `trackers.track` and `perCall.track` default to 60 000 (they are synchronous
   * and may take up to ~60s). Override per call via the method's options.
   */
  timeoutMs?: number;
  /** Custom `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Extra default headers merged into every request (cannot override `Authorization`). */
  headers?: Record<string, string>;
}

/** Per-request options accepted by every resource method. */
export interface RequestOptions {
  /** Override the timeout (ms) for this single call. */
  timeoutMs?: number;
  /** An `AbortSignal` to cancel this call; combined with the SDK timeout. */
  signal?: AbortSignal;
  /** Extra headers for this single call. */
  headers?: Record<string, string>;
}

/** Options for methods that address a tracker by id. */
export interface TrackerLookupOptions extends RequestOptions {
  /** Resolve the path id as a `trackerId` (default) or as your `clientTrackerId`. */
  searchBy?: 'trackerId' | 'clientTrackerId';
}

export const DEFAULT_BASE_URL = 'https://api.ship24.com';
export const API_PREFIX = '/public/v1';
export const DEFAULT_TIMEOUT_MS = 10_000;
/** Longer default timeout for the synchronous endpoints (`trackers.track`, `perCall.track`). */
export const SYNC_TIMEOUT_MS = 60_000;

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  fetch: typeof fetch;
  defaultHeaders: Record<string, string>;
}

export function resolveConfig(config: Ship24Config): ResolvedConfig {
  if (!config || typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
    throw new Ship24Error('Ship24: `apiKey` is required and must be a non-empty string.');
  }

  const rawFetch = config.fetch ?? globalThis.fetch;
  if (typeof rawFetch !== 'function') {
    throw new Ship24Error(
      'Ship24: no global `fetch` is available. Use Node 18+, or pass a `fetch` implementation: new Ship24({ apiKey, fetch }).',
    );
  }
  // Bind the default global fetch to avoid "Illegal invocation" in browsers;
  // a user-supplied fetch is used as-is (they control its binding).
  const fetchImpl = config.fetch ?? (rawFetch as typeof fetch).bind(globalThis);

  return {
    apiKey: config.apiKey.trim(),
    baseUrl: (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    fetch: fetchImpl,
    defaultHeaders: { ...(config.headers ?? {}) },
  };
}
