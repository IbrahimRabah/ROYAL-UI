import { PageResponse } from '../common/page-response';

/**
 * Product reviews. A customer who received a product reviews it once; staff approve it before the public
 * sees it. PENDING and REJECTED are visible only to the author and to staff.
 */
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A product the customer received and has not reviewed yet. */
export interface EligibleReview {
  productId: number;
  slug: string;
  name: string;
  imageUrl?: string | null;
  orderNumber: string;
}

export interface MyReview {
  id: number;
  productId: number;
  productSlug: string;
  productName: string;
  orderNumber: string;
  rating: number;
  comment?: string | null;
  status: ReviewStatus;
  /** Staff's note, present only on a REJECTED review. */
  moderationNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWriteRequest {
  rating: number;
  comment: string | null;
}

export interface PublicReview {
  id: number;
  /** «Ahmed M.»: first name and an initial. */
  reviewerName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface ProductReviews {
  /** Average stars; absent when there are no reviews. */
  average?: number | null;
  count: number;
  /** How many reviews gave 5, 4, 3, 2 and 1 stars. Every key is present. */
  breakdown: Record<string, number>;
  reviews: PageResponse<PublicReview>;
}

export interface AdminReview {
  id: number;
  productId: number;
  productSlug: string;
  productName: string;
  customerId: number;
  /** The account's full name; the page shows `reviewerName` instead. */
  customerName?: string | null;
  reviewerName: string;
  orderNumber: string;
  rating: number;
  comment?: string | null;
  status: ReviewStatus;
  moderatedBy?: number | null;
  moderatedAt?: string | null;
  moderationNote?: string | null;
  createdAt: string;
}

export interface ReviewCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export type ReviewBulkAction = 'APPROVE' | 'REJECT';

export interface ReviewBulkSkipped {
  id: number;
  /** REVIEW_NOT_FOUND, ALREADY_APPROVED or ALREADY_REJECTED. */
  reason: string;
}

export interface ReviewBulkResponse {
  action: ReviewBulkAction;
  requested: number;
  succeeded: number[];
  skipped: ReviewBulkSkipped[];
}
