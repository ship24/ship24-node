import type { ApiErrorItem } from './types/responses.js';

/** Base class for every error thrown by the SDK. `instanceof Ship24Error` catches them all. */
export class Ship24Error extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'Ship24Error';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface Ship24APIErrorInit {
  message: string;
  httpStatus: number;
  errors: ApiErrorItem[];
  code?: string;
  requestId?: string;
  body?: unknown;
}

/** An error response from the Ship24 API (an HTTP response was received). */
export class Ship24APIError extends Ship24Error {
  /** HTTP status code of the response. */
  readonly httpStatus: number;
  /** The `errors` array from the response body (may be empty for non-JSON bodies, e.g. 429). */
  readonly errors: ApiErrorItem[];
  /** The first error `code`, if any (e.g. `tracker_not_found`). */
  readonly code: string | undefined;
  /** The `x-request-id` response header, if present — quote it to Ship24 support. */
  readonly requestId: string | undefined;
  /** The raw parsed response body. */
  readonly body: unknown;

  constructor(init: Ship24APIErrorInit) {
    super(init.message);
    this.name = 'Ship24APIError';
    this.httpStatus = init.httpStatus;
    this.errors = init.errors;
    this.code = init.code;
    this.requestId = init.requestId;
    this.body = init.body;
  }
}

/** Authentication failed: `auth_missing_header`/`auth_invalid_header` (400) or `auth_invalid_api_key` (401). */
export class AuthenticationError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'AuthenticationError';
  }
}

/** The request was rejected as invalid (400): validation, malformed body, immutable field, etc. */
export class InvalidRequestError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'InvalidRequestError';
  }
}
export { InvalidRequestError as ValidationError };

/** The requested resource was not found (404): `tracker_not_found`, `parcel_not_found`. */
export class NotFoundError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'NotFoundError';
  }
}

/** A conflict occurred: `request_conflict` (409) or `tracker_conflict` (400). */
export class ConflictError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'ConflictError';
  }
}

export interface RateLimitInfo {
  /** IETF `RateLimit-Limit` — requests allowed per window. */
  limit: number | null;
  /** IETF `RateLimit-Remaining`. */
  remaining: number | null;
  /** IETF `RateLimit-Reset` — seconds until reset. */
  reset: number | null;
}

/** Rate limit exceeded (429). Exposes `retryAfter` (seconds) and IETF `RateLimit-*` state. */
export class RateLimitError extends Ship24APIError {
  /** Seconds to wait before retrying, from the `Retry-After` header. */
  readonly retryAfter: number | undefined;
  /** IETF `RateLimit-*` header values (preferred over the legacy `X-RateLimit-*`). */
  readonly rateLimit: RateLimitInfo | undefined;

  constructor(init: Ship24APIErrorInit & { retryAfter?: number; rateLimit?: RateLimitInfo }) {
    super(init);
    this.name = 'RateLimitError';
    this.retryAfter = init.retryAfter;
    this.rateLimit = init.rateLimit;
  }
}

/** A usage quota or bulk limit was reached: `quota_limit_reached` (403/405), `bulk_create_limit_exceeded` (403). */
export class QuotaError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'QuotaError';
  }
}

/** The account has no active subscription for this resource: `no_active_subscription` (422). */
export class SubscriptionError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'SubscriptionError';
  }
}

/** The API returned a server error (5xx). */
export class ServerError extends Ship24APIError {
  constructor(init: Ship24APIErrorInit) {
    super(init);
    this.name = 'ServerError';
  }
}

/** A network failure occurred before any HTTP response was received. */
export class Ship24ConnectionError extends Ship24Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'Ship24ConnectionError';
  }
}

/** The request exceeded its timeout. */
export class Ship24TimeoutError extends Ship24Error {
  readonly timeoutMs: number;
  constructor(message: string, timeoutMs: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'Ship24TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

type APIErrorCtor = new (init: Ship24APIErrorInit) => Ship24APIError;

const CODE_TO_CLASS: Record<string, APIErrorCtor> = {
  auth_missing_header: AuthenticationError,
  auth_invalid_header: AuthenticationError,
  auth_invalid_api_key: AuthenticationError,
  tracker_not_found: NotFoundError,
  parcel_not_found: NotFoundError,
  request_conflict: ConflictError,
  tracker_conflict: ConflictError,
  quota_limit_reached: QuotaError,
  bulk_create_limit_exceeded: QuotaError,
  no_active_subscription: SubscriptionError,
  validation_error: InvalidRequestError,
  missing_mandatory_field: InvalidRequestError,
  parsing_error: InvalidRequestError,
  shipping_date_outdated: InvalidRequestError,
  webhook_url_missing: InvalidRequestError,
  tracker_not_updatable: InvalidRequestError,
  processing_error: InvalidRequestError,
};

/**
 * Maps an HTTP error response to the appropriate {@link Ship24APIError} subclass.
 * Code-primary, status-fallback: the error `code` decides the class where known
 * (so quirks like `tracker_conflict`=400 or `quota_limit_reached`=405 map correctly);
 * otherwise the HTTP status decides. 429 always yields a {@link RateLimitError}.
 */
export function toShip24Error(httpStatus: number, body: unknown, headers: Headers): Ship24APIError {
  const requestId = headers.get('x-request-id') ?? undefined;
  const { errors, message } = extractErrors(body, httpStatus);
  const code = errors[0]?.code || undefined;

  let init: Ship24APIErrorInit = { message, httpStatus, errors, code, requestId, body };

  if (httpStatus === 429) {
    return new RateLimitError({
      ...init,
      retryAfter: headerNumber(headers, 'retry-after') ?? undefined,
      rateLimit: {
        limit: headerNumber(headers, 'ratelimit-limit'),
        remaining: headerNumber(headers, 'ratelimit-remaining'),
        reset: headerNumber(headers, 'ratelimit-reset'),
      },
    });
  }

  if (code === 'no_active_subscription') {
    init = { ...init, message: subscriptionMessage(message, code) };
  }

  if (code && Object.prototype.hasOwnProperty.call(CODE_TO_CLASS, code)) {
    const Ctor = CODE_TO_CLASS[code] as APIErrorCtor;
    return new Ctor(init);
  }

  if (httpStatus === 401) return new AuthenticationError(init);
  if (httpStatus === 404) return new NotFoundError(init);
  if (httpStatus === 409) return new ConflictError(init);
  if (httpStatus === 400) return new InvalidRequestError(init);
  if (httpStatus >= 500) return new ServerError(init);
  return new Ship24APIError(init);
}

function extractErrors(body: unknown, status: number): { errors: ApiErrorItem[]; message: string } {
  if (body && typeof body === 'object' && Array.isArray((body as { errors?: unknown }).errors)) {
    const raw = (body as { errors: unknown[] }).errors;
    const errors: ApiErrorItem[] = raw
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({ code: String(e.code ?? ''), message: String(e.message ?? '') }));
    if (errors.length > 0) {
      const message =
        errors
          .map((e) => e.message || e.code)
          .filter(Boolean)
          .join('; ') || `Ship24 API error (HTTP ${status}).`;
      return { errors, message };
    }
  }
  if (typeof body === 'string' && body.trim()) {
    return { errors: [], message: body.trim() };
  }
  return { errors: [], message: `Ship24 API error (HTTP ${status}).` };
}

function subscriptionMessage(serverMessage: string, code: string): string {
  const base =
    serverMessage && serverMessage !== code
      ? serverMessage
      : 'This request requires an active subscription.';
  return `${base} If you are using the per-call product (ship24.perCall.track), it requires a separate active "Per-call" subscription — see your Ship24 dashboard or https://www.ship24.com/.`;
}

function headerNumber(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
