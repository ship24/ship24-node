import { Ship24 } from 'ship24';

const ship24 = new Ship24({ apiKey: process.env.SHIP24_API_KEY ?? '' });

const couriers = await ship24.couriers.list();
console.log(`${couriers.length} couriers`);
for (const courier of couriers.slice(0, 5)) {
  console.log(courier.courierCode, courier.courierName);
}
