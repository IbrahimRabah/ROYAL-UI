import { PageResponse } from '../common/page-response';

/**
 * FAQs, the SEO texts, and the staff team.
 * The storefront reads published FAQs and the head text of the static pages; the SEO team edits meta texts and
 * FAQs; the owner decides who is on the team.
 */

export type FaqScope = 'PRODUCT' | 'CATEGORY' | 'GENERAL';
export type FaqStatus = 'DRAFT' | 'PUBLISHED';
export type FaqTopic = 'GENERAL' | 'ORDERS' | 'SHIPPING' | 'PAYMENT' | 'RETURNS' | 'CUSTOM_WORK' | 'CHECKOUT';

/** A published FAQ in the language asked for. */
export interface Faq {
  id: number;
  question: string;
  answer: string;
  topic?: FaqTopic | null;
}

/** The head text of a static page; absent fields mean «use the built-in text». */
export interface PublicSeoPage {
  title?: string | null;
  description?: string | null;
  noindex: boolean;
}

export interface AdminFaq {
  id: number;
  scope: FaqScope;
  targetId?: number | null;
  targetName?: string | null;
  topic?: FaqTopic | null;
  questionAr: string;
  answerAr: string;
  questionEn?: string | null;
  answerEn?: string | null;
  position: number;
  status: FaqStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FaqSaveRequest {
  scope: FaqScope;
  targetId: number | null;
  topic: FaqTopic | null;
  questionAr: string;
  answerAr: string;
  questionEn: string | null;
  answerEn: string | null;
  position?: number | null;
  status: FaqStatus;
}

export type SeoFilter = 'ALL' | 'MISSING_TITLE' | 'MISSING_DESCRIPTION' | 'TOO_LONG' | 'DUPLICATE' | 'NO_FAQ';

export interface SeoOverview {
  products: {
    total: number;
    missingTitle: number;
    missingDescription: number;
    titleTooLong: number;
    descriptionTooLong: number;
    duplicateTitle: number;
    withoutFaq: number;
  };
  categories: { total: number; missingTitle: number; missingDescription: number; withoutFaq: number };
  pages: { total: number; missingTitle: number; missingDescription: number };
  faqs: { published: number; drafts: number };
}

/** A product or category with its SEO text. */
export interface SeoRow {
  id: number;
  slug: string;
  status: string;
  name: string;
  metaTitleAr?: string | null;
  metaDescriptionAr?: string | null;
  metaTitleEn?: string | null;
  metaDescriptionEn?: string | null;
  faqCount: number;
  duplicateTitle: boolean;
}

export interface SeoMetaRequest {
  metaTitleAr: string | null;
  metaDescriptionAr: string | null;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
}

export interface SeoPageAdmin {
  pageKey: string;
  titleAr?: string | null;
  descriptionAr?: string | null;
  titleEn?: string | null;
  descriptionEn?: string | null;
  noindex: boolean;
  updatedAt: string;
}

export interface SeoPageRequest {
  titleAr: string | null;
  descriptionAr: string | null;
  titleEn: string | null;
  descriptionEn: string | null;
  noindex: boolean;
}

export type StaffRole = 'ADMIN' | 'SEO_EDITOR';

export interface TeamMember {
  id: number;
  email: string;
  name: string;
  roles: StaffRole[];
}

export type SeoRowPage = PageResponse<SeoRow>;
