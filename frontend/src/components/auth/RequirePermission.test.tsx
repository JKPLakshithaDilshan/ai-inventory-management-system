import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { RequirePermission } from './RequirePermission';
import { PERMISSIONS, ROLES } from '@/lib/rbac';

const mockUseAuthStore = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe('RequirePermission', () => {
  it('redirects to unauthorized when permission is missing', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Viewer',
        email: 'viewer@test.local',
        role: ROLES.VIEWER,
      },
    });

    render(
      <MemoryRouter initialEntries={['/alerts']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          <Route element={<RequirePermission permission={PERMISSIONS.ALERTS_MANAGE} />}>
            <Route path="/alerts" element={<div>Alerts Manage</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('renders child route when permission exists', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'u2',
        name: 'Admin',
        email: 'admin@test.local',
        role: ROLES.ADMIN,
      },
    });

    render(
      <MemoryRouter initialEntries={['/alerts']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          <Route element={<RequirePermission permission={PERMISSIONS.ALERTS_MANAGE} />}>
            <Route path="/alerts" element={<div>Alerts Manage</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Alerts Manage')).toBeInTheDocument();
  });
});
