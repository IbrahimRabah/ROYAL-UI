import { ProductStatus } from '../enums/product-status';
import { StatusTone } from './order-status.constants';

export const PRODUCT_STATUS_LABELS_AR: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: 'مسودة',
  [ProductStatus.ACTIVE]: 'نشط',
  [ProductStatus.ARCHIVED]: 'مؤرشف',
};

export const PRODUCT_STATUS_LABELS_EN: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: 'Draft',
  [ProductStatus.ACTIVE]: 'Active',
  [ProductStatus.ARCHIVED]: 'Archived',
};

export const PRODUCT_STATUS_TONE: Record<ProductStatus, StatusTone> = {
  [ProductStatus.DRAFT]: 'warn',
  [ProductStatus.ACTIVE]: 'ok',
  [ProductStatus.ARCHIVED]: 'muted',
};
