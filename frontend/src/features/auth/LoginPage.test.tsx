import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { LoginPage } from './LoginPage';

const mockLogin = vi.fn();
const mockClearError = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    loading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockClearError.mockReset();
    mockNavigate.mockReset();
  });

  it('disables button when inputs are empty', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Initially, button should be disabled (both fields empty)
    const signInButton = screen.getByRole('button', { name: /^sign in$/i });
    expect(signInButton).toBeDisabled();

    // Fill in username, password still empty - button should still be disabled
    const usernameInput = screen.getByLabelText(/username or email/i);
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    expect(signInButton).toBeDisabled();

    // Now fill in password - button should be enabled
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    expect(signInButton).not.toBeDisabled();

    // Clear username - button should be disabled again
    fireEvent.change(usernameInput, { target: { value: '' } });
    expect(signInButton).toBeDisabled();
  });

  it('submits credentials and navigates on success', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
