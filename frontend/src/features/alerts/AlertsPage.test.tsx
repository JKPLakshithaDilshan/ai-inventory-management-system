import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { AlertsPage } from './AlertsPage';

const mockGetInventoryAlerts = vi.fn();
const mockWarehouseList = vi.fn();

vi.mock('@/services/analytics', () => ({
  getInventoryAlerts: (...args: unknown[]) => mockGetInventoryAlerts(...args),
}));

vi.mock('@/services/warehouses', () => ({
  warehouseApi: {
    list: (...args: unknown[]) => mockWarehouseList(...args),
  },
}));

describe('AlertsPage', () => {
  beforeEach(() => {
    mockGetInventoryAlerts.mockReset();
    mockWarehouseList.mockReset();
    mockWarehouseList.mockResolvedValue({ items: [] });
  });

  it('renders empty state when there are no alerts', async () => {
    mockGetInventoryAlerts.mockResolvedValue({
      alerts: [],
      total_count: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      generated_at: new Date().toISOString(),
    });

    render(<AlertsPage />);

    expect(await screen.findByText(/no matching alerts/i)).toBeInTheDocument();
  });

  it('renders alert rows from API', async () => {
    mockGetInventoryAlerts.mockResolvedValue({
      alerts: [
        {
          alert_id: 'low_stock:1:0',
          alert_type: 'low_stock',
          severity: 'high',
          title: 'Low stock',
          message: 'Stock is below threshold',
          product_id: 1,
          product_sku: 'PRD-001',
          product_name: 'Laptop',
          warehouse_id: null,
          warehouse_name: null,
          current_stock: 3,
          reorder_level: 8,
          suggested_order_qty: 12,
          stockout_risk_score: 80,
          supplier_id: null,
          supplier_name: null,
          detected_at: new Date().toISOString(),
        },
      ],
      total_count: 1,
      critical_count: 0,
      high_count: 1,
      medium_count: 0,
      low_count: 0,
      generated_at: new Date().toISOString(),
    });

    render(<AlertsPage />);

    expect(await screen.findByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText(/suggested: 12 units/i)).toBeInTheDocument();
  });

  it('renders error message when request fails', async () => {
    mockGetInventoryAlerts.mockRejectedValue(new Error('Alerts API error'));

    render(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load alerts/i)).toBeInTheDocument();
    });
  });
});
