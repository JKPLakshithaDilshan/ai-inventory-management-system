import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { ProductsPage } from './ProductsPage';

const mockGetProducts = vi.fn();

vi.mock('@/services/products', () => ({
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('./ProductForm', () => ({
  ProductForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/common/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

describe('ProductsPage', () => {
  beforeEach(() => {
    mockGetProducts.mockReset();
  });

  it('renders products returned from API and supports refresh', async () => {
    mockGetProducts.mockResolvedValue({
      items: [
        {
          id: 1,
          sku: 'PRD-001',
          name: 'Laptop',
          quantity: 12,
          stock_status: 'in_stock',
          selling_price: 1200,
        },
      ],
      total: 1,
      total_pages: 1,
    });

    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('PRD-001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(mockGetProducts).toHaveBeenCalledTimes(2);
    });
  });
});
