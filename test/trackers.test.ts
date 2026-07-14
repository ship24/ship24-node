import { describe, expect, it } from 'vitest';
import { trackerFixture, trackingFixture } from './fixtures.js';
import { jsonResponse, makeClient } from './helpers.js';

describe('trackers', () => {
  it('create → unwraps data.tracker (201)', async () => {
    const { client } = makeClient(() => jsonResponse(201, { data: { tracker: trackerFixture } }));
    const result = await client.trackers.create({ trackingNumber: 'ABC12' });
    expect(result.trackerId).toBe(trackerFixture.trackerId);
  });

  it('track → unwraps data.trackings and accepts 200', async () => {
    const { client } = makeClient(() =>
      jsonResponse(200, { data: { trackings: [trackingFixture] } }),
    );
    const results = await client.trackers.track({ trackingNumber: 'ABC12' });
    expect(results).toHaveLength(1);
    expect(results[0]?.tracker.trackerId).toBe(trackerFixture.trackerId);
  });

  it('track → also accepts 201 (current API behavior)', async () => {
    const { client } = makeClient(() =>
      jsonResponse(201, { data: { trackings: [trackingFixture] } }),
    );
    const results = await client.trackers.track({ trackingNumber: 'ABC12' });
    expect(results).toHaveLength(1);
  });

  it('list → unwraps data.trackers', async () => {
    const { client } = makeClient(() =>
      jsonResponse(200, { data: { trackers: [trackerFixture] } }),
    );
    const results = await client.trackers.list();
    expect(results[0]?.trackingNumber).toBe(trackerFixture.trackingNumber);
  });

  it('get → sends searchBy and hits the right path', async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(200, { data: { tracker: trackerFixture } }),
    );
    await client.trackers.get('my-client-id', { searchBy: 'clientTrackerId' });
    expect(calls[0]?.url).toContain('/trackers/my-client-id');
    expect(calls[0]?.url).toContain('searchBy=clientTrackerId');
  });

  it('update → issues a PATCH', async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(200, { data: { tracker: trackerFixture } }),
    );
    await client.trackers.update(trackerFixture.trackerId, { isSubscribed: false });
    expect(calls[0]?.init.method).toBe('PATCH');
  });

  it('getResults → unwraps data.trackings', async () => {
    const { client } = makeClient(() =>
      jsonResponse(200, { data: { trackings: [trackingFixture] } }),
    );
    const results = await client.trackers.getResults(trackerFixture.trackerId);
    expect(results).toHaveLength(1);
  });

  it('getResultsByTrackingNumber → hits the search path', async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(200, { data: { trackings: [trackingFixture] } }),
    );
    await client.trackers.getResultsByTrackingNumber('9400115901047177598206');
    expect(calls[0]?.url).toContain('/trackers/search/9400115901047177598206/results');
  });

  it('resendWebhooks → coerces totalResent to a number', async () => {
    const { client } = makeClient(() =>
      jsonResponse(201, { data: { summary: { totalResent: '8' } } }),
    );
    const result = await client.trackers.resendWebhooks(trackerFixture.trackerId);
    expect(result.totalResent).toBe(8);
  });

  it('downloadWebhookHistory → returns the parsed body plus the filename', async () => {
    const body = {
      metadata: {
        trackingNumber: '9400',
        trackerId: trackerFixture.trackerId,
        clientTrackerId: null,
        webhookUrl: null,
        lastSuccessfulPushAt: null,
        lastFailedPushAt: null,
      },
      webhooks: [],
    };
    const { client } = makeClient(() =>
      jsonResponse(200, body, {
        'content-disposition': 'attachment; filename="webhook-history-9400-20260714.json"',
      }),
    );
    const result = await client.trackers.downloadWebhookHistory(trackerFixture.trackerId);
    expect(result.filename).toBe('webhook-history-9400-20260714.json');
    expect(result.webhooks).toEqual([]);
  });
});
