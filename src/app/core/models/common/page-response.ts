export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export const emptyPage = <T>(size = 0): PageResponse<T> => ({
  content: [],
  page: 0,
  size,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
  empty: true,
});
