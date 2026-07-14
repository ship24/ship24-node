import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

// Synchronous — may take up to ~60s (the SDK uses a 60 000ms default timeout here).
const results = await ship24.trackers.track({ trackingNumber: '1234567890' });
for (const tracking of results) {
  console.log(tracking.tracker.trackerId, tracking.shipment.statusMilestone);
  console.log(`${tracking.events.length} events`);
}
