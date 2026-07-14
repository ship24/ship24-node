import { describe, expect, it } from 'vitest';
import { courierFixture } from './fixtures.js';
import { jsonResponse, makeClient } from './helpers.js';

describe('couriers', () => {
  it('list → unwraps data.couriers', async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(200, { data: { couriers: [courierFixture] } }),
    );
    const result = await client.couriers.list();
    expect(result[0]?.courierCode).toBe('us-post');
    expect(calls[0]?.url).toBe('https://api.ship24.com/public/v1/couriers');
  });
});
