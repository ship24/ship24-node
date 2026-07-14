import { API_PREFIX, type RequestOptions, type ResolvedConfig } from './config.js';
import { Ship24ConnectionError, Ship24TimeoutError, toShip24Error } from './errors.js';

type QueryValue = string | number | boolean | undefined | null;

export interface RequestSpec<T> {
  method: 'GET' | 'POST' | 'PATCH';
  /** Path relative to `/public/v1`, with path params already interpolated + encoded. */
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** HTTP status codes treated as success (ignored when `bulk` is true). */
  successCodes: number[];
  defaultTimeoutMs: number;
  /** Extracts the typed return value from the parsed body (+ response, for headers). */
  unwrap: (parsed: unknown, response: Response) => T;
  /**
   * Bulk endpoints: success is detected by the presence of a `status` envelope field
   * (`success`/`partial`/`error`), not the HTTP status — so 201/207/400/403 all return
   * the parsed envelope, and only envelope-less failures (auth, 429) throw.
   */
  bulk?: boolean;
}

/**
 * The isomorphic fetch transport. Handles URL building, auth/headers, timeouts,
 * envelope unwrapping, and error mapping. No Node-only APIs — runs on Node 18+,
 * Bun, Deno, Cloudflare Workers/edge, and browsers.
 */
export class Transport {
  constructor(private readonly cfg: ResolvedConfig) {}

  async request<T>(spec: RequestSpec<T>, opts?: RequestOptions): Promise<T> {
    const url = this.buildUrl(spec.path, spec.query);
    const timeoutMs = opts?.timeoutMs ?? spec.defaultTimeoutMs;
    const headers = this.buildHeaders(spec, opts);

    // Manual AbortController combiner (portable across Node 18.0+/edge; avoids
    // AbortSignal.any/timeout which require newer runtimes).
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (opts?.signal) {
      if (opts.signal.aborted) controller.abort();
      else opts.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    let response: Response;
    try {
      response = await this.cfg.fetch(url, {
        method: spec.method,
        headers,
        body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
        signal: controller.signal,
      });
    } catch (err) {
      if (timedOut) {
        throw new Ship24TimeoutError(
          `Ship24: request to ${spec.method} ${spec.path} timed out after ${timeoutMs}ms.`,
          timeoutMs,
          { cause: err },
        );
      }
      if (opts?.signal?.aborted) throw err; // caller-initiated abort — propagate as-is
      throw new Ship24ConnectionError(
        `Ship24: network error requesting ${spec.method} ${spec.path}.`,
        { cause: err },
      );
    } finally {
      clearTimeout(timer);
      opts?.signal?.removeEventListener('abort', onExternalAbort);
    }

    const parsed = await readBody(response);

    const success = spec.bulk
      ? isBulkEnvelope(parsed)
      : spec.successCodes.includes(response.status);

    if (!success) {
      throw toShip24Error(response.status, parsed, response.headers);
    }
    return spec.unwrap(parsed, response);
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${this.cfg.baseUrl}${API_PREFIX}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(spec: RequestSpec<unknown>, opts?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (spec.body !== undefined) headers['Content-Type'] = 'application/json';
    for (const [key, value] of Object.entries({ ...this.cfg.defaultHeaders, ...opts?.headers })) {
      // Drop user-supplied Authorization in any casing so the API key always wins.
      if (key.toLowerCase() !== 'authorization') headers[key] = value;
    }
    headers.Authorization = `Bearer ${this.cfg.apiKey}`;
    return headers;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // e.g. the 429 plain-text body, or an HTML 5xx page
  }
}

function isBulkEnvelope(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const status = (parsed as { status?: unknown }).status;
  return status === 'success' || status === 'partial' || status === 'error';
}
