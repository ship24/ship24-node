import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

const created = await ship24.trackers.create({
  trackingNumber: '1234567890',
  courierCode: 'us-post',
  clientTrackerId: 'order-4242',
});

// Look the tracker up by your own client id.
const fetched = await ship24.trackers.get('order-4242', { searchBy: 'clientTrackerId' });
console.log(created.trackerId === fetched.trackerId);
