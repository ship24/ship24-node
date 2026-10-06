export interface TrackerRecipientInput {
  /** Max 254 chars. */
  email?: string;
  /** Max 100 chars. */
  name?: string;
}

export interface TrackerSettingsInput {
  /**
   * If `true`, restrict tracking to the courier(s) in `courierCode`; otherwise
   * Ship24 may extend tracking to additional couriers.
   */
  restrictTrackingToCourierCode?: boolean;
}

/** Body for `trackers.create` and `trackers.track`. */
export interface CreateTrackerRequest {
  /** Tracking number, 5–50 chars, matching `^[a-zA-Z0-9-_/.]*$`. */
  trackingNumber: string;
  /** Max 100 chars. */
  shipmentReference?: string;
  /** Max 100 chars. */
  clientTrackerId?: string;
  /** ISO 3166-1 alpha-2/alpha-3, uppercase. */
  originCountryCode?: string;
  /** ISO 3166-1 alpha-2/alpha-3, uppercase. */
  destinationCountryCode?: string;
  /** 1–32 chars, matching `^[A-Za-z0-9 _\-\./]+$`. */
  destinationPostCode?: string;
  shippingDate?: string;
  /** Up to 3 courier codes. */
  courierCode?: string | string[];
  /** Max 200 chars. */
  courierName?: string;
  /** Max 1000 chars. */
  trackingUrl?: string;
  /** Max 50 chars. */
  orderNumber?: string;
  /** Max 255 chars. */
  title?: string;
  recipient?: TrackerRecipientInput;
  settings?: TrackerSettingsInput;
}

/**
 * Body for `perCall.track`. A strict subset of {@link CreateTrackerRequest}.
 *
 * ⚠ Per-call product only — requires a separate active Per-call subscription.
 */
export interface PerCallTrackRequest {
  trackingNumber: string;
  /** ISO 3166-1 alpha-2/alpha-3, uppercase. */
  originCountryCode?: string;
  /** ISO 3166-1 alpha-2/alpha-3, uppercase. */
  destinationCountryCode?: string;
  /** 1–32 chars, matching `^[A-Za-z0-9 _\-\./]+$`. */
  destinationPostCode?: string;
  shippingDate?: string;
  /** Up to 3 courier codes. */
  courierCode?: string | string[];
}

/**
 * Body for `trackers.update` (PATCH).
 *
 * Once shipment data is gathered, `courierCode`/`originCountryCode`/
 * `destinationCountryCode`/`shippingDate` become immutable and the API returns
 * `tracker_not_updatable` (400). This is documented, not guarded client-side.
 */
export interface UpdateTrackerRequest {
  isSubscribed?: boolean;
  courierCode?: string | string[];
  /** ISO 3166-1 alpha-2/alpha-3, uppercase. */
  originCountryCode?: string;
  /** ISO 3166-1 alpha-2/alpha-3, uppercase. */
  destinationCountryCode?: string;
  /** 1–32 chars, matching `^[A-Za-z0-9 _\-\./]+$`. */
  destinationPostCode?: string;
  shippingDate?: string;
  /** Max 200 chars. */
  courierName?: string;
  /** Max 1000 chars. */
  trackingUrl?: string;
  /** Only `name` can be updated; `email` is not patchable. */
  recipient?: Pick<TrackerRecipientInput, 'name'>;
}

/** Query parameters for `trackers.list` (page-based pagination). */
export interface ListTrackersParams {
  /** Page number, ≥ 1. Server default: 1. */
  page?: number;
  /** Page size, 1–500. Server default: 100. */
  limit?: number;
  /** `1` ascending (default) or `-1` descending, by `createdAt`. */
  sort?: 1 | -1;
}
