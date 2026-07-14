export { Ship24 } from './client.js';
export { CouriersResource } from './resources/couriers.js';
export { PerCallResource } from './resources/perCall.js';
export { TrackersResource } from './resources/trackers.js';
export { VERSION } from './version.js';

export type { Ship24Config, RequestOptions, TrackerLookupOptions } from './config.js';

export type * from './types/index.js';

export {
  Ship24Error,
  Ship24APIError,
  AuthenticationError,
  InvalidRequestError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  QuotaError,
  SubscriptionError,
  ServerError,
  Ship24ConnectionError,
  Ship24TimeoutError,
} from './errors.js';
export type { RateLimitInfo, Ship24APIErrorInit } from './errors.js';
