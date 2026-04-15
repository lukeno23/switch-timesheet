export const buildCacheKey = (dateRange, filters, entityId) => {
  const parts = [
    dateRange?.start || '',
    dateRange?.end || '',
    ...(filters || []).sort(),
    entityId || '',
  ];
  return parts.join('|');
};
