import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

const history = await ship24.trackers.downloadWebhookHistory(
  '26148317-7502-d3ac-44a9-546d240ac0dd',
);

console.log('Suggested filename:', history.filename);
console.log(`${history.webhooks.length} webhook attempts`);
for (const attempt of history.webhooks) {
  console.log(attempt.status, attempt.pushTimestamp, attempt.responseStatusCode);
}
