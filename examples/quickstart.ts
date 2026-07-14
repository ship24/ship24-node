import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

const tracker = await ship24.trackers.create({ trackingNumber: '1234567890' });
console.log('Created tracker', tracker.trackerId);
