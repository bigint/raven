interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getOffset = (page: number, limit: number): number =>
  (page - 1) * limit;

export const buildPaginationMeta = (
  { page, limit }: PaginationInput,
  total: number
): PaginationMeta => ({
  limit,
  page,
  total,
  totalPages: Math.ceil(total / limit)
});
