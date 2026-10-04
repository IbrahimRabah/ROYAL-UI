export enum FulfillmentType {
  READY_MADE = 'READY_MADE',
  MADE_TO_ORDER = 'MADE_TO_ORDER',
  CUSTOM_WORK = 'CUSTOM_WORK',
}

export type CustomRequestType = 'SIZE_VARIANT' | 'MADE_TO_ORDER' | 'CUSTOM_WORK';

/** Which custom-request mode a product opens: a size change on stock, or a made-to-order / custom job. */
export function customRequestTypeFor(type: FulfillmentType | null | undefined): CustomRequestType {
  switch (type ?? FulfillmentType.READY_MADE) {
    case FulfillmentType.MADE_TO_ORDER:
      return 'MADE_TO_ORDER';
    case FulfillmentType.CUSTOM_WORK:
      return 'CUSTOM_WORK';
    default:
      return 'SIZE_VARIANT';
  }
}

/** Rows from before the field existed arrive without it — treat those as ready made. */
export function isReadyMade(product: { fulfillmentType?: FulfillmentType | null } | null | undefined): boolean {
  return (product?.fulfillmentType ?? FulfillmentType.READY_MADE) === FulfillmentType.READY_MADE;
}
