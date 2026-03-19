import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { RequireAuth } from './route-guards';

const mockUseAuthStore = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe('RequireAuth', () => {
  it('redirects unauthenticated users to login', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/private" element={<div>Private Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders nested route for authenticated users', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/private" element={<div>Private Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Private Content')).toBeInTheDocument();
  });
});
