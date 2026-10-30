import { FulfillmentType } from '../../../enums/fulfillment-type';
import { ShippingSizeClass } from '../../../enums/shipping-size-class';
import { Money } from '../../common/money';

export type ImportBatchStatus = 'PREVIEW' | 'COMMITTED' | 'DISCARDED';
export type ImportRowAction = 'CREATE' | 'UPDATE';
export type ImportRowStatus = 'VALID' | 'ERROR';
export type ImportSeverity = 'ERROR' | 'WARNING';

/** An uploaded sheet and what the checks found. Nothing is in the catalogue until it is committed. */
export interface ImportBatchResponse {
  id: number;
  fileName: string;
  status: ImportBatchStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  /** Valid rows that carry a warning. */
  warningRows: number;
  /** True only while the batch is a preview with no error rows. */
  canSubmit: boolean;
  createdAt: string;
  committedAt: string | null;
}

/** One finding about a cell or row. Branch on `code`, never on `message`. */
export interface ImportMessage {
  /** Header of the column concerned, null for a whole-row finding. */
  column: string | null;
  /** The key of the value in the row editor (a key of `values`), null for a whole-row finding. */
  field: string | null;
  /** The cell in the uploaded workbook, e.g. "AN5" or "SEO!T7"; null when it has no cell. */
  cell: string | null;
  severity: ImportSeverity;
  code: string;
  message: string;
}

export interface ImportRowData {
  sku: string | null;
  categoryName: string | null;
  categoryId: number | null;
  nameAr: string | null;
  nameEn: string | null;
  shortAr: string | null;
  shortEn: string | null;
  descAr: string | null;
  descEn: string | null;
  metaTitleAr: string | null;
  metaTitleEn: string | null;
  metaDescAr: string | null;
  metaDescEn: string | null;
  slug: string | null;
  price: Money | null;
  compareAtPrice: Money | null;
  stock: number | null;
  fulfillmentType: FulfillmentType | null;
  shippingSizeClass: ShippingSizeClass | null;
  requiresAssembly: boolean | null;
  assemblyFee: Money | null;
  weightGrams: number | null;
  specs: Record<string, string>;
}

/** A specification the sheet can carry, filled or not. */
export interface ImportRowSpecification {
  code: string;
  /** The key of the value in the row editor, e.g. "spec_width_cm". */
  key: string;
  label: string;
  /** TEXT, NUMBER, or BOOLEAN (written as «نعم» / «لا»). */
  kind: 'TEXT' | 'NUMBER' | 'BOOLEAN';
  value: string | null;
}

export interface ImportRowResponse {
  /** The row number in the sheet, header = 1. */
  rowNo: number;
  sku: string | null;
  /** Null when the row could not be read. */
  action: ImportRowAction | null;
  status: ImportRowStatus;
  data: ImportRowData;
  /** Every editable value by field key; what the row editor starts from and sends back. */
  values: Record<string, string>;
  specifications: ImportRowSpecification[];
  messages: ImportMessage[];
  productId: number | null;
}

/** Corrections to one row: only the keys sent change. Everything is text; a typo comes back as a finding. */
export interface ImportRowEditRequest {
  values: Record<string, string>;
}

/** The row after an edit, and the batch with the counts the edit changed (also other rows can change). */
export interface ImportRowUpdateResponse {
  batch: ImportBatchResponse;
  row: ImportRowResponse;
  /** OTHER rows whose result changed because of this edit, to update in place. */
  affected: ImportRowResponse[];
}

export type ImportSkuStatus = 'AVAILABLE' | 'DUPLICATE_IN_FILE' | 'IN_CATALOG' | 'EMPTY';

/** Whether a SKU typed in the row editor is unique: free, taken by another row of the sheet, or already sold. */
export interface ImportSkuCheck {
  sku: string;
  status: ImportSkuStatus;
  /** DUPLICATE_IN_FILE: the other rows of this sheet that have it. */
  rowNos: number[];
  /** IN_CATALOG: the product that already uses it (an error: a SKU is never reused). */
  productId: number | null;
  productName: string | null;
}

export interface ImportCommitResponse {
  batchId: number;
  /** Products created, all as drafts. */
  created: number;
  note: string;
}
