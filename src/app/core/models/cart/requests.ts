export interface AddCartItemRequest {
  variantId: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface MergeCartRequest {
  guestToken: string;
}
