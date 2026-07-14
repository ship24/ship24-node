import { Ship24, SubscriptionError } from 'ship24';

// ⚠ Per-call product only — requires a separate active Per-call subscription.
const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

try {
  const results = await ship24.perCall.track({
    trackingNumber: '1234567890',
    destinationCountryCode: 'US',
  });
  for (const result of results) {
    // Note: PerCallTracking has no `tracker` field.
    console.log(result.shipment.statusMilestone, `${result.events.length} events`);
  }
} catch (err) {
  if (err instanceof SubscriptionError) {
    console.error(err.message); // actionable: points to the Per-call subscription requirement
  } else {
    throw err;
  }
}
