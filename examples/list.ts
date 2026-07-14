import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

// Page-based pagination: page (>=1), limit (1-500), sort (1 asc / -1 desc).
const trackers = await ship24.trackers.list({ page: 1, limit: 50, sort: -1 });
console.log(`Fetched ${trackers.length} trackers`);
