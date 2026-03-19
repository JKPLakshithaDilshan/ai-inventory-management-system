import { describe, expect, it } from 'vitest';
import { buildCustomersListQuery } from './customers';

describe('buildCustomersListQuery', () => {
  it('builds full query string with all filters', () => {
    const query = buildCustomersListQuery({
      skip: 20,
      limit: 10,
      search: 'acme',
      is_active: true,
      customer_type: 'business',
    });

    expect(query).toContain('skip=20');
    expect(query).toContain('limit=10');
    expect(query).toContain('search=acme');
    expect(query).toContain('is_active=true');
    expect(query).toContain('customer_type=business');
  });

  it('returns empty string for default params', () => {
    expect(buildCustomersListQuery()).toBe('');
  });
});
