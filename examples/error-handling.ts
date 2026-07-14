import { NotFoundError, RateLimitError, Ship24, Ship24Error, SubscriptionError } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

try {
  const [tracking] = await ship24.trackers.getResults('does-not-exist');
  console.log(tracking?.shipment.statusMilestone);
} catch (err) {
  if (err instanceof NotFoundError) {
    console.error('Not found:', err.code, 'request', err.requestId);
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited; retry after ${err.retryAfter ?? '?'}s`);
  } else if (err instanceof SubscriptionError) {
    console.error(err.message);
  } else if (err instanceof Ship24Error) {
    console.error('Ship24 error:', err.message);
  } else {
    throw err;
  }
}
