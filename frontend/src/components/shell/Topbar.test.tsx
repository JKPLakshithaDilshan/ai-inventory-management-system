import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { Topbar } from './Topbar';
  import { ThemeProvider } from '@/components/theme-provider';

const mockGetNotifications = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ logout: vi.fn() }),
}));

vi.mock('@/services/notifications', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markAsRead: vi.fn(),
  clearNotifications: vi.fn(),
}));

describe('Topbar notifications', () => {
  beforeEach(() => {
    mockGetNotifications.mockReset();
    // Mock localStorage for theme persistence
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  it('renders unread notification count badge', async () => {
    mockGetNotifications.mockResolvedValue({
      items: [
        {
          id: 1,
          title: 'Low Stock Alert',
          message: 'Laptop is low on stock',
          type: 'warning',
          read: false,
          created_at: new Date().toISOString(),
          action_url: '/alerts',
        },
      ],
      total: 1,
      unread_count: 1,
    });

     render(
       <ThemeProvider defaultTheme="light">
         <MemoryRouter>
           <Topbar />
         </MemoryRouter>
       </ThemeProvider>
     );

    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });
});
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
