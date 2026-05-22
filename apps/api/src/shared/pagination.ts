export type PaginationQuery = {
  page?: number | string;
  limit?: number | string;
};

export function getPagination(query: PaginationQuery) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
