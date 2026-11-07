/**
 * Validates query parameters for GET /api/locations/search?q=<query>&count=<count>.
 */
export function validateLocationSearchQuery(queryObj = {}) {
  const rawQuery = typeof queryObj.q === 'string' ? queryObj.q.trim() : '';

  if (rawQuery.length < 3) {
    return {
      valid: false,
      error: 'Search query "q" must be at least 3 characters long.',
    };
  }

  if (rawQuery.length > 120) {
    return {
      valid: false,
      error: 'Search query "q" must not exceed 120 characters.',
    };
  }

  let count = 5;
  if (queryObj.count !== undefined && queryObj.count !== null && queryObj.count !== '') {
    const parsedCount = Number(queryObj.count);
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 10) {
      return {
        valid: false,
        error: 'Optional parameter "count" must be an integer between 1 and 10.',
      };
    }
    count = parsedCount;
  }

  return {
    valid: true,
    data: {
      query: rawQuery,
      count,
    },
  };
}
