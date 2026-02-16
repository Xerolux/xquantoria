import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../pages/DashboardPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockStats = {
  posts: { total: 100, published: 80, draft: 20 },
  users: { total: 50, active: 45 },
  comments: { total: 200, pending: 10 },
  revenue: { total: 5000, this_month: 1000 },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with stats', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays post statistics correctly', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/posts/i)).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
    });
  });

  it('displays revenue statistics', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
    });
  });

  it('refreshes stats on button click', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValue({ data: mockStats });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});
