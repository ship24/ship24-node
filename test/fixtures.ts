import type {
  Courier,
  Shipment,
  Statistics,
  Tracker,
  Tracking,
  TrackingEvent,
} from '../src/index.js';

export const trackerFixture: Tracker = {
  trackerId: '26148317-7502-d3ac-44a9-546d240ac0dd',
  trackingNumber: '9400115901047177598206',
  shipmentReference: null,
  courierCode: ['us-post'],
  clientTrackerId: null,
  isSubscribed: true,
  isTracked: true,
  createdAt: '2021-03-10T05:13:00.000Z',
};

export const shipmentFixture: Shipment = {
  shipmentId: 'ship-1',
  statusCode: 'delivery_delivered',
  statusCategory: 'delivery',
  statusMilestone: 'delivered',
  originCountryCode: 'CN',
  destinationCountryCode: 'US',
  delivery: {
    estimatedDeliveryDate: null,
    courierEstimatedDeliveryDate: null,
    service: null,
    signedBy: null,
  },
  trackingNumbers: [{ tn: '9400115901047177598206' }],
  recipient: null,
};

export const eventFixture: TrackingEvent = {
  eventId: 'evt-1',
  trackingNumber: '9400115901047177598206',
  eventTrackingNumber: '9400115901047177598206',
  status: 'Delivered to the addressee',
  occurrenceDatetime: '2025-03-04T17:12:57',
  order: 9,
  location: 'SAN RAFAEL, CA 94901',
  sourceCode: 'usps-tracking',
  courierCode: 'us-post',
  statusCode: 'delivery_delivered',
  statusCategory: 'delivery',
  statusMilestone: 'delivered',
};

export const statisticsFixture: Statistics = {
  timestamps: {
    infoReceivedDatetime: '2025-03-02T15:38:57',
    inTransitDatetime: '2025-03-02T15:38:57',
    outForDeliveryDatetime: '2025-03-04T10:12:57',
    failedAttemptDatetime: null,
    availableForPickupDatetime: null,
    exceptionDatetime: null,
    deliveredDatetime: '2025-03-04T17:12:57',
  },
};

export const trackingFixture: Tracking = {
  tracker: trackerFixture,
  shipment: shipmentFixture,
  events: [eventFixture],
  statistics: statisticsFixture,
};

export const courierFixture: Courier = {
  courierCode: 'us-post',
  courierName: 'USPS',
  website: 'https://www.usps.com',
  isPost: true,
  countryCode: 'US',
  requiredFields: null,
  isDeprecated: false,
};
