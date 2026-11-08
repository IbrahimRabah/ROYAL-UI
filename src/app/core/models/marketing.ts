import { Money } from './common/money';

/**
 * The announcement bar and sale discounts. A running discount lowers prices by itself (products, cart and order
 * already carry the sale price); these models are for the message strip, the banners and the admin screens.
 */

export type AnnouncementAnimation = 'STATIC' | 'MARQUEE' | 'FADE' | 'PULSE';
export type AnnouncementTheme = 'GOLD' | 'DARK' | 'RED' | 'GREEN' | 'LIGHT';

/** One message of the strip above the header, in the language asked for. */
export interface PublicAnnouncement {
  id: number;
  text: string;
  /** A path on this site or an https link. */
  linkUrl?: string | null;
  linkLabel?: string | null;
  animation: AnnouncementAnimation;
  theme: AnnouncementTheme;
  dismissible: boolean;
  /** When to count down to; absent when there is no countdown. */
  countdownEndsAt?: string | null;
  promotionPercent?: number | null;
  /** Changes whenever the message is edited, so a dismissal of the old text does not hide the new one. */
  version: number;
}

export type PromotionScope = 'ALL' | 'CATEGORY' | 'PRODUCT';
export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED';
export type PromotionState = 'DRAFT' | 'PAUSED' | 'SCHEDULED' | 'RUNNING' | 'ENDED';

/** A running discount, for the sale banners. */
export interface PublicPromotion {
  id: number;
  name: string;
  headline?: string | null;
  percent: number;
  scope: PromotionScope;
  targetId?: number | null;
  targetSlug?: string | null;
  bannerUrl?: string | null;
  bannerMobileUrl?: string | null;
  endsAt: string;
  /** Where the banner leads, e.g. `/products?onSale=true` or `/products?categoryId=3`. */
  landingPath: string;
}

export interface AdminPromotion {
  id: number;
  nameAr: string;
  nameEn?: string | null;
  scope: PromotionScope;
  targetId?: number | null;
  targetName?: string | null;
  percent: number;
  startsAt: string;
  endsAt: string;
  status: PromotionStatus;
  state: PromotionState;
  headlineAr?: string | null;
  headlineEn?: string | null;
  bannerUrl?: string | null;
  bannerMobileUrl?: string | null;
  /** An order was placed under it: it can be ended but not deleted. */
  usedByOrders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionSaveRequest {
  nameAr: string;
  nameEn: string | null;
  scope: PromotionScope;
  targetId: number | null;
  percent: number;
  startsAt: string;
  endsAt: string;
  headlineAr: string | null;
  headlineEn: string | null;
  confirmHighDiscount: boolean;
}

export interface PromotionExample {
  sku: string;
  productName?: string | null;
  listPrice: Money;
  salePrice: Money;
  costPrice?: Money | null;
}

export interface PromotionImpact {
  affectedProducts: number;
  affectedVariants: number;
  /** Variants whose sale price would be below their cost price. Activation is refused while any exist. */
  belowCost: number;
  highDiscount: boolean;
  examples: PromotionExample[];
  belowCostExamples: PromotionExample[];
  overlaps: { id: number; nameAr: string; percent: number; scope: PromotionScope; state: PromotionState }[];
}

export interface AdminAnnouncement {
  id: number;
  textAr?: string | null;
  textEn?: string | null;
  linkUrl?: string | null;
  linkLabelAr?: string | null;
  linkLabelEn?: string | null;
  animation: AnnouncementAnimation;
  theme: AnnouncementTheme;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
  position: number;
  dismissible: boolean;
  showCountdown: boolean;
  promotionId?: number | null;
  promotionName?: string | null;
  promotionState?: PromotionState | null;
  /** Visitors see it at this moment. */
  showingNow: boolean;
  updatedAt: string;
}

export interface AnnouncementSaveRequest {
  textAr: string | null;
  textEn: string | null;
  linkUrl: string | null;
  linkLabelAr: string | null;
  linkLabelEn: string | null;
  animation: AnnouncementAnimation;
  theme: AnnouncementTheme;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  dismissible: boolean;
  showCountdown: boolean;
  promotionId: number | null;
}
