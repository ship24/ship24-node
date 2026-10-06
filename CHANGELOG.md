# ship24

## 1.1.0

### Minor Changes

- Sync with the latest Ship24 OpenAPI spec: `trackers.update` accepts `courierName`, `trackingUrl` and `recipient.name` and returns the updated `recipient` (new `UpdatedTracker` type), `shipment.delivery.aiPredictiveDeliveryDate` is added, and `shipment.delivery.signedBy` is deprecated.
