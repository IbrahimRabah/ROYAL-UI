/**
 * Bulk image import: pictures matched to products by file name = SKU.
 * `SKU.ext` is a product's main image, `SKU_2.ext`, `SKU_3.ext` … its extra images.
 */

/** What to do with a product that already has images. */
export type ImageImportMode = 'SKIP' | 'ADD' | 'REPLACE';

export interface ImageMatchFileRef {
  name: string;
  sizeBytes: number;
  /** The folder the file was in; shown back so two files with one name can be told apart. */
  folder: string | null;
}

export interface ImageMatchRequest {
  mode: ImageImportMode;
  files: ImageMatchFileRef[];
}

export interface ImageMatchSummary {
  files: number;
  /** Files that will be uploaded. */
  toUpload: number;
  /** Products left alone because they already have images (mode SKIP). */
  productsSkipped: number;
  products: number;
  conflicts: number;
  unmatched: number;
  productsWithoutImage: number;
}

/** ATTACH, SKIP_HAS_IMAGES (mode SKIP and it has images) or BLOCKED (archived). */
export type ImageMatchAction = 'ATTACH' | 'SKIP_HAS_IMAGES' | 'BLOCKED';

export interface ImageMatchedFile {
  name: string;
  folder?: string | null;
  /** 1 is the main image, 2 and up are SKU_2, SKU_3 … */
  position: number;
  sizeBytes: number;
  /** False when this file will not be uploaded. */
  upload: boolean;
  /** DUPLICATE_POSITION or TOO_MANY_IMAGES when `upload` is false for a file-level reason. */
  problem?: string | null;
}

export interface ImageProductMatch {
  sku: string;
  productId: number;
  /** Set only when the product has several variants. */
  variantId?: number | null;
  nameAr?: string | null;
  nameEn?: string | null;
  categoryName?: string | null;
  status: string;
  existingImageCount: number;
  action: ImageMatchAction;
  /** PRODUCT_ARCHIVED when action is BLOCKED. */
  blockedReason?: string | null;
  files: ImageMatchedFile[];
}

export interface ImageConflictFile {
  name: string;
  folder?: string | null;
  position: number;
  sizeBytes: number;
}

export interface ImageConflict {
  sku: string;
  /** DUPLICATE_POSITION */
  reason: string;
  files: ImageConflictFile[];
}

/** NO_PRODUCT, NOT_AN_IMAGE, UNSUPPORTED_FORMAT (e.g. HEIC) or AMBIGUOUS_NAME. */
export interface ImageUnmatched {
  name: string;
  folder?: string | null;
  sizeBytes: number;
  reason: string;
  /** The SKU the name does match, when the format is the problem. */
  sku?: string | null;
  /** A near miss, for the person to rename; never used by itself. */
  suggestionSku?: string | null;
  suggestionPosition?: number | null;
}

export interface ImageWithoutImageItem {
  productId: number;
  sku?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
}

export interface ImageMatchResponse {
  mode: ImageImportMode;
  summary: ImageMatchSummary;
  products: ImageProductMatch[];
  conflicts: ImageConflict[];
  unmatched: ImageUnmatched[];
  productsWithoutImage: { total: number; items: ImageWithoutImageItem[] };
}

export type ImageFileStatus = 'ATTACHED' | 'SKIPPED' | 'REJECTED' | 'FAILED';

export interface ImageFileResult {
  name: string;
  status: ImageFileStatus;
  /**
   * SKIPPED: HAS_IMAGES, DUPLICATE_IMAGE. REJECTED: NO_MATCH, AMBIGUOUS_NAME, UNSUPPORTED_FORMAT, NOT_AN_IMAGE,
   * TOO_LARGE, EMPTY_FILE, PRODUCT_ARCHIVED, LIMIT_REACHED, DUPLICATE_POSITION. FAILED: SERVER_ERROR.
   * Absent when ATTACHED.
   */
  code?: string | null;
  sku?: string | null;
  productId?: number | null;
  imageId?: number | null;
  url?: string | null;
}

export interface ImageBulkResponse {
  runId: string;
  mode: ImageImportMode;
  counts: { attached: number; skipped: number; rejected: number; failed: number };
  results: ImageFileResult[];
}
