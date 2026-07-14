import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

// Up to 100 items. The result is always returned (never thrown) for 201/207/400/403.
const result = await ship24.trackers.bulkCreate([
  { trackingNumber: '1111111111' },
  { trackingNumber: '2222222222' },
]);

console.log('Bulk status:', result.status); // 'success' | 'partial' | 'error'
for (const item of result.data ?? []) {
  if (item.itemStatus === 'error') {
    console.error('Failed:', item.inputData.trackingNumber, item.errors);
  } else {
    console.log('OK:', item.tracker?.trackerId, `(${item.itemStatus})`);
  }
}
