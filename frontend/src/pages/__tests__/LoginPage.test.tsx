import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

// Mock authStore
vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
    isAuthenticated: false,
    error: null,
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  it('should render login form', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const { login } = require('../../store/authStore');
    login.mockRejectedValue(new Error('Validation failed'));

    renderLoginPage();

    const loginButton = screen.getByRole('button', { name: /Login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Please input your email/i)).toBeInTheDocument();
      expect(screen.getByText(/Please input your password/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    renderLoginPage();

    const emailInput = screen.getByLabelText(/Email/i);
    await userEvent.type(emailInput, 'invalidemail');

    const loginButton = screen.getByRole('button', { name: /Login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/The input is not valid E-mail/i)).toBeInTheDocument();
    });
  });

  it('should submit login form with valid credentials', async () => {
    const { login } = require('../../store/authStore');
    login.mockResolvedValue({ user: { id: 1, email: 'test@example.com' } });

    renderLoginPage();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    const loginButton = screen.getByRole('button', { name: /Login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });
  });

  it('should remember me checkbox', async () => {
    const { login } = require('../../store/authStore');
    login.mockResolvedValue({ user: { id: 1, email: 'test@example.com' } });

    renderLoginPage();

    const rememberMeCheckbox = screen.getByRole('checkbox', { name: /Angemeldet bleiben/i });
    expect(rememberMeCheckbox).toBeInTheDocument();

    await userEvent.click(rememberMeCheckbox);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    const loginButton = screen.getByRole('button', { name: /Login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });
  });

  it('should display security alert for remember me', () => {
    renderLoginPage();

    expect(screen.getByText(/Security Alert/i)).toBeInTheDocument();
    expect(screen.getByText(/For your security, only use this option on trusted devices/i)).toBeInTheDocument();
  });

  it('should show loading state during login', async () => {
    const { login } = require('../../store/authStore');
    login.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderLoginPage();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    const loginButton = screen.getByRole('button', { name: /Login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(loginButton).toBeDisabled();
    });
  });

  it('should handle login failure', async () => {
    const { login } = require('../../store/authStore');
    login.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderLoginPage();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');

    const loginButton = screen.getByRole('button', { name: /Login/i });
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should have link to forgot password page', () => {
    renderLoginPage();

    const forgotPasswordLink = screen.getByText(/Forgot password/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('should have link to register page', () => {
    renderLoginPage();

    const registerLink = screen.getByText(/Don't have an account/i);
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('should have link to home page', () => {
    renderLoginPage();

    const homeLink = screen.getByText(/Back to home/i);
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });
});
