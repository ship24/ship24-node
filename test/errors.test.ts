import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  ConflictError,
  InvalidRequestError,
  NotFoundError,
  QuotaError,
  RateLimitError,
  Ship24APIError,
  Ship24ConnectionError,
  Ship24TimeoutError,
  ValidationError,
} from '../src/index.js';
import { jsonResponse, makeClient, textResponse } from './helpers.js';

function errorResponse(
  status: number,
  code: string,
  headers: Record<string, string> = {},
): Response {
  return jsonResponse(status, { errors: [{ code, message: `msg-${code}` }], data: null }, headers);
}

describe('error mapping', () => {
  it('401 auth_invalid_api_key → AuthenticationError', async () => {
    const { client } = makeClient(() => errorResponse(401, 'auth_invalid_api_key'));
    await expect(client.couriers.list()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('400 auth_missing_header → AuthenticationError (by code, not status)', async () => {
    const { client } = makeClient(() => errorResponse(400, 'auth_missing_header'));
    await expect(client.couriers.list()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('400 validation_error → InvalidRequestError', async () => {
    const { client } = makeClient(() => errorResponse(400, 'validation_error'));
    await expect(client.trackers.create({ trackingNumber: 'x' })).rejects.toBeInstanceOf(
      InvalidRequestError,
    );
  });

  it('404 tracker_not_found → NotFoundError', async () => {
    const { client } = makeClient(() => errorResponse(404, 'tracker_not_found'));
    await expect(client.trackers.get('abc-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('409 request_conflict → ConflictError', async () => {
    const { client } = makeClient(() => errorResponse(409, 'request_conflict'));
    await expect(client.trackers.create({ trackingNumber: 'x' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('400 tracker_conflict → ConflictError (by code, despite the 400 status)', async () => {
    const { client } = makeClient(() => errorResponse(400, 'tracker_conflict'));
    await expect(client.trackers.create({ trackingNumber: 'x' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('405 quota_limit_reached → QuotaError (mapped by code, not status)', async () => {
    const { client } = makeClient(() => errorResponse(405, 'quota_limit_reached'));
    await expect(client.couriers.list()).rejects.toBeInstanceOf(QuotaError);
  });

  it('429 plain-text body → RateLimitError with retryAfter + rate-limit info', async () => {
    const { client } = makeClient(() =>
      textResponse(429, 'Too many requests, please try again later.', {
        'retry-after': '2',
        'ratelimit-limit': '10',
        'ratelimit-remaining': '0',
        'ratelimit-reset': '1',
      }),
    );
    try {
      await client.couriers.list();
      throw new Error('expected the call to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      const rle = err as RateLimitError;
      expect(rle.retryAfter).toBe(2);
      expect(rle.rateLimit?.limit).toBe(10);
    }
  });

  it('captures the x-request-id header on API errors', async () => {
    const { client } = makeClient(() =>
      errorResponse(404, 'tracker_not_found', { 'x-request-id': 'req-abc' }),
    );
    try {
      await client.trackers.get('abc-1');
      throw new Error('expected the call to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Ship24APIError);
      expect((err as Ship24APIError).requestId).toBe('req-abc');
      expect((err as Ship24APIError).httpStatus).toBe(404);
    }
  });

  it('surfaces a network failure as Ship24ConnectionError', async () => {
    const { client } = makeClient(() => {
      throw new TypeError('fetch failed');
    });
    await expect(client.couriers.list()).rejects.toBeInstanceOf(Ship24ConnectionError);
  });

  it('surfaces a timeout as Ship24TimeoutError', async () => {
    const { client } = makeClient(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );
    await expect(client.couriers.list({ timeoutMs: 10 })).rejects.toBeInstanceOf(
      Ship24TimeoutError,
    );
  });

  it('exposes ValidationError as an alias of InvalidRequestError', () => {
    expect(ValidationError).toBe(InvalidRequestError);
  });
});
