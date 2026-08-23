// Shared by ProductDetailResponse.categoryPath and CategoryDetailResponse.breadcrumb.
export interface CategoryBreadcrumbItem {
  id: number;
  slug: string;
  name: string;
}

// GET /categories/tree (storefront only) — recursive. GET /admin/categories returns a
// different, richer shape (CategoryAdminResponse, catalog/admin/category-admin.ts) — a
// single already-translated `name` here vs full translations[] there. Do not reuse
// between the two.
// imageUrl/bannerUrl confirmed nullable by the admin tree example
// ("discontinued-line" -> imageUrl: null, bannerUrl: null).
export interface CategoryNode {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  displayOrder: number;
  // Product count for this category (its own products; matches what GET /products?
  // categoryId={id} would total). Not yet in the local contract snapshot at the time
  // this was wired — added per BACKEND_NOTES item 3's request, same field name/shape
  // already used for attribute-value productCount elsewhere in the contract. Nullable
  // per the global "omit null fields" convention (may arrive as undefined too).
  productCount: number | null;
  children: CategoryNode[];
}

// GET /categories/{slug}
export interface CategoryDetailResponse {
  id: number;
  slug: string;
  name: string;
  // Not shown null in the one example, but inferred nullable by analogy with the
  // product/category translation fields (description/metaTitle/metaDescription are
  // explicitly null in admin translation examples).
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  children: CategoryNode[];
  breadcrumb: CategoryBreadcrumbItem[];
  metaTitle: string | null;
  metaDescription: string | null;
}
