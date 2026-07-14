import { describe, expect, it } from 'vitest';
import { trackerFixture } from './fixtures.js';
import { jsonResponse, makeClient } from './helpers.js';

describe('transport', () => {
  it('builds the URL with the /public/v1 prefix and prod base by default', async () => {
    const { client, calls } = makeClient(() => jsonResponse(200, { data: { couriers: [] } }));
    await client.couriers.list();
    expect(calls[0]?.url).toBe('https://api.ship24.com/public/v1/couriers');
  });

  it('honors a baseUrl override and strips trailing slashes', async () => {
    const { client, calls } = makeClient(() => jsonResponse(200, { data: { couriers: [] } }), {
      baseUrl: 'https://test.example.com/',
    });
    await client.couriers.list();
    expect(calls[0]?.url).toBe('https://test.example.com/public/v1/couriers');
  });

  it('sends Bearer auth and Accept headers', async () => {
    const { client, calls } = makeClient(() => jsonResponse(200, { data: { couriers: [] } }));
    await client.couriers.list();
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers.Accept).toBe('application/json');
  });

  it('sets Content-Type and a JSON body on writes', async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(201, { data: { tracker: trackerFixture } }),
    );
    await client.trackers.create({ trackingNumber: 'ABC12' });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(calls[0]?.init.body).toBe(JSON.stringify({ trackingNumber: 'ABC12' }));
  });

  it('omits pagination params when absent and serializes them when present', async () => {
    const first = makeClient(() => jsonResponse(200, { data: { trackers: [] } }));
    await first.client.trackers.list();
    expect(first.calls[0]?.url).toBe('https://api.ship24.com/public/v1/trackers');

    const second = makeClient(() => jsonResponse(200, { data: { trackers: [] } }));
    await second.client.trackers.list({ page: 2, limit: 50, sort: -1 });
    const url = second.calls[0]?.url ?? '';
    expect(url).toContain('page=2');
    expect(url).toContain('limit=50');
    expect(url).toContain('sort=-1');
  });

  it('merges custom default headers but keeps Authorization fixed', async () => {
    const { client, calls } = makeClient(() => jsonResponse(200, { data: { couriers: [] } }), {
      headers: { 'X-Custom': 'yes', Authorization: 'Bearer hacked' },
    });
    await client.couriers.list();
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['X-Custom']).toBe('yes');
    expect(headers.Authorization).toBe('Bearer test-key');
  });

  it('strips a user Authorization header in any casing', async () => {
    const { client, calls } = makeClient(() => jsonResponse(200, { data: { couriers: [] } }), {
      headers: { authorization: 'Bearer hacked' },
    });
    await client.couriers.list({ headers: { AUTHORIZATION: 'Bearer hacked-too' } });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
    expect(headers.AUTHORIZATION).toBeUndefined();
    expect(headers.Authorization).toBe('Bearer test-key');
  });
});
