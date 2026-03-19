import { describe, expect, it } from 'vitest';

import { buildStockAdjustmentsQuery } from '@/services/stock-adjustments';

describe('buildStockAdjustmentsQuery', () => {
  it('builds query with all fields', () => {
    const query = buildStockAdjustmentsQuery({
      skip: 20,
      limit: 10,
      product_id: 5,
      warehouse_id: 3,
      adjustment_type: 'increase',
      date_from: '2026-03-01',
      date_to: '2026-03-07',
    });

    expect(query).toContain('skip=20');
    expect(query).toContain('limit=10');
    expect(query).toContain('product_id=5');
    expect(query).toContain('warehouse_id=3');
    expect(query).toContain('adjustment_type=increase');
    expect(query).toContain('date_from=2026-03-01');
    expect(query).toContain('date_to=2026-03-07');
  });

  it('returns empty query for empty input', () => {
    expect(buildStockAdjustmentsQuery({})).toBe('');
    expect(buildStockAdjustmentsQuery()).toBe('');
  });
});
