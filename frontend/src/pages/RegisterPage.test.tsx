import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('RegisterPage', () => {
  it('renders registration form', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    // Use getAllByText because "Registrieren" appears in Title and Button
    const headings = screen.getAllByText('Registrieren');
    expect(headings.length).toBeGreaterThan(0);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort bestätigen')).toBeInTheDocument();
  });
});
