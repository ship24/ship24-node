import { describe, expect, it } from 'vitest';
import { SubscriptionError } from '../src/index.js';
import { eventFixture, shipmentFixture, statisticsFixture } from './fixtures.js';
import { jsonResponse, makeClient } from './helpers.js';

describe('perCall.track', () => {
  it('unwraps data.trackings and returns PerCallTracking (no tracker field)', async () => {
    const perCallItem = {
      shipment: shipmentFixture,
      events: [eventFixture],
      statistics: statisticsFixture,
    };
    const { client, calls } = makeClient(() =>
      jsonResponse(201, { data: { trackings: [perCallItem] } }),
    );
    const results = await client.perCall.track({ trackingNumber: 'ABC12' });
    expect(calls[0]?.url).toBe('https://api.ship24.com/public/v1/tracking/search');
    expect(results).toHaveLength(1);
    const first = results[0];
    // @ts-expect-error PerCallTracking has no `tracker` field — the product difference is compiler-enforced.
    void first?.tracker;
    expect(first?.shipment.statusMilestone).toBe('delivered');
  });

  it('maps no_active_subscription (422) to an actionable SubscriptionError', async () => {
    const handler = () =>
      jsonResponse(422, {
        errors: [
          { code: 'no_active_subscription', message: 'No active subscription allows this.' },
        ],
        data: null,
      });
    const { client } = makeClient(handler);
    try {
      await client.perCall.track({ trackingNumber: 'ABC12' });
      throw new Error('expected the call to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(SubscriptionError);
      expect((err as SubscriptionError).httpStatus).toBe(422);
      expect((err as Error).message).toMatch(/per-call/i);
    }
  });
});
