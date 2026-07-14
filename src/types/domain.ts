/**
 * A non-strict logistics timestamp. May be a date (`2021-03-04`), a date-time
 * (`2021-03-04T17:12:57`), UTC (`...Z`), or offset (`...+02:00`). The SDK keeps
 * this as a raw `string` and does NOT coerce to `Date` — coercion would lose
 * "no time" / offset fidelity. (A parse helper is planned for v1.1.)
 */
export type LogisticDateTime = string;

/** A strict ISO 8601 date-time string, e.g. `2021-03-10T05:13:00.000Z`. */
export type IsoDateTime = string;

/** A tracker — the per-shipment tracking record you create and Ship24 tracks asynchronously. */
export interface Tracker {
  trackerId: string;
  trackingNumber: string;
  shipmentReference: string | null;
  /** 0–3 courier codes. The API returns a single string or an array. */
  courierCode?: string | string[];
  clientTrackerId: string | null;
  isSubscribed: boolean;
  isTracked: boolean;
  createdAt: IsoDateTime;
}

export interface ShipmentDelivery {
  estimatedDeliveryDate: IsoDateTime | null;
  courierEstimatedDeliveryDate: {
    from: LogisticDateTime | null;
    to: LogisticDateTime | null;
  } | null;
  service: string | null;
  signedBy: string | null;
}

export interface ShipmentRecipient {
  name: string | null;
  address: string | null;
  postCode: string | null;
  city: string | null;
  subdivision: string | null;
}

export interface Shipment {
  shipmentId: string | null;
  statusCode: string | null;
  statusCategory: string | null;
  statusMilestone: string;
  originCountryCode: string | null;
  destinationCountryCode: string | null;
  delivery: ShipmentDelivery;
  trackingNumbers: { tn: string }[];
  recipient: ShipmentRecipient | null;
}

/**
 * A tracking event. (The Ship24 API calls this object `Event`; the SDK exports it
 * as `TrackingEvent` to avoid shadowing the global DOM `Event` type.)
 */
export interface TrackingEvent {
  eventId: string;
  trackingNumber: string;
  eventTrackingNumber: string;
  status: string | null;
  occurrenceDatetime: LogisticDateTime;
  order: number | null;
  location: string | null;
  sourceCode: string | null;
  courierCode: string | null;
  statusCode: string | null;
  statusCategory: string | null;
  statusMilestone: string;
}

export interface Statistics {
  timestamps: {
    infoReceivedDatetime: LogisticDateTime | null;
    inTransitDatetime: LogisticDateTime | null;
    outForDeliveryDatetime: LogisticDateTime | null;
    failedAttemptDatetime: LogisticDateTime | null;
    availableForPickupDatetime: LogisticDateTime | null;
    exceptionDatetime: LogisticDateTime | null;
    deliveredDatetime: LogisticDateTime | null;
  };
}

export type CourierRequiredField =
  | 'destinationPostCode'
  | 'destinationCountryCode'
  | 'courierAccount';

export interface Courier {
  courierCode: string;
  courierName: string;
  website: string | null;
  isPost: boolean;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string | null;
  requiredFields: CourierRequiredField[] | null;
  isDeprecated: boolean;
}

/** Metadata present only in webhook payloads. Never returned by REST endpoints. */
export interface WebhookMetadata {
  generatedAt: IsoDateTime;
  messageId: string;
  topic: string;
}

/**
 * A per-shipment tracking result. Returned by `trackers.track`,
 * `trackers.getResults`, and `trackers.getResultsByTrackingNumber`.
 */
export interface Tracking {
  tracker: Tracker;
  shipment: Shipment;
  events: TrackingEvent[];
  statistics: Statistics;
  /** Present only in webhook payloads (v1.1); never on REST responses. */
  metadata?: WebhookMetadata;
}

/**
 * A per-call tracking result. Returned ONLY by `perCall.track`.
 *
 * Note the absence of a `tracker` field — this is a distinct type from
 * {@link Tracking} so the product difference is enforced by the compiler.
 */
export interface PerCallTracking {
  shipment: Shipment;
  events: TrackingEvent[];
  statistics: Statistics;
}
