import { describe, expect, it } from 'vitest';
import { AuthenticationError, RateLimitError } from '../src/index.js';
import { trackerFixture } from './fixtures.js';
import { jsonResponse, makeClient, textResponse } from './helpers.js';

const input = { trackingNumber: 'ABC12' };

describe('trackers.bulkCreate', () => {
  it('returns the envelope on 201 success (does not throw)', async () => {
    const body = {
      status: 'success',
      summary: { totalInputs: 1, totalCreated: 1, totalExisting: 0, totalErrors: 0 },
      data: [{ itemStatus: 'created', inputData: input, tracker: trackerFixture, errors: null }],
      error: null,
    };
    const { client } = makeClient(() => jsonResponse(201, body));
    const result = await client.trackers.bulkCreate([input]);
    expect(result.status).toBe('success');
    expect(result.summary?.totalCreated).toBe(1);
  });

  it('returns the envelope on 207 partial (does not throw)', async () => {
    const body = {
      status: 'partial',
      summary: { totalInputs: 2, totalCreated: 1, totalExisting: 0, totalErrors: 1 },
      data: [
        { itemStatus: 'created', inputData: input, tracker: trackerFixture, errors: null },
        {
          itemStatus: 'error',
          inputData: input,
          tracker: null,
          errors: [{ code: 'validation_error', message: 'bad' }],
        },
      ],
      error: null,
    };
    const { client } = makeClient(() => jsonResponse(207, body));
    const result = await client.trackers.bulkCreate([input, input]);
    expect(result.status).toBe('partial');
    expect(result.data?.[1]?.itemStatus).toBe('error');
  });

  it('returns the envelope on 400 all-failed (does not throw)', async () => {
    const body = {
      status: 'error',
      summary: null,
      data: [
        {
          itemStatus: 'error',
          inputData: input,
          tracker: null,
          errors: [{ code: 'validation_error', message: 'bad' }],
        },
      ],
      error: { code: 'processing_error', message: 'All failed' },
    };
    const { client } = makeClient(() => jsonResponse(400, body));
    const result = await client.trackers.bulkCreate([input]);
    expect(result.status).toBe('error');
    expect(result.error?.code).toBe('processing_error');
  });

  it('returns the envelope on 403 quota (does not throw)', async () => {
    const body = {
      status: 'error',
      summary: null,
      data: null,
      error: { code: 'quota_limit_reached', message: 'Quota reached' },
    };
    const { client } = makeClient(() => jsonResponse(403, body));
    const result = await client.trackers.bulkCreate([input]);
    expect(result.error?.code).toBe('quota_limit_reached');
  });

  it('throws RateLimitError on 429 (plain-text body, no envelope)', async () => {
    const { client } = makeClient(() =>
      textResponse(429, 'Too many requests, please try again later.', { 'retry-after': '1' }),
    );
    await expect(client.trackers.bulkCreate([input])).rejects.toBeInstanceOf(RateLimitError);
  });

  it('throws AuthenticationError on 401 (standard error envelope, no status field)', async () => {
    const { client } = makeClient(() =>
      jsonResponse(401, {
        errors: [{ code: 'auth_invalid_api_key', message: 'bad key' }],
        data: null,
      }),
    );
    await expect(client.trackers.bulkCreate([input])).rejects.toBeInstanceOf(AuthenticationError);
  });
});
