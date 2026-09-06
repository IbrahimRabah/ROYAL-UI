export interface CategoryBreadcrumbItem {
  id: number;
  slug: string;
  name: string;
}
export interface CategoryNode {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  displayOrder: number;
  productCount: number | null;
  children: CategoryNode[];
}

export interface CategoryDetailResponse {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  children: CategoryNode[];
  breadcrumb: CategoryBreadcrumbItem[];
  metaTitle: string | null;
  metaDescription: string | null;
}
