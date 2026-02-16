import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PostsPage from '../pages/PostsPage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPosts = {
  data: [
    { id: 1, title: 'Test Post 1', status: 'published', created_at: '2024-01-01' },
    { id: 2, title: 'Test Post 2', status: 'draft', created_at: '2024-01-02' },
  ],
  meta: { total: 2, current_page: 1, per_page: 15 },
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

describe('PostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders posts list', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: mockPosts });

    renderWithProviders(<PostsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
      expect(screen.getByText('Test Post 2')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<PostsPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('filters posts by status', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: mockPosts });

    renderWithProviders(<PostsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText(/status/i);
    fireEvent.change(statusFilter, { target: { value: 'published' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/posts', expect.objectContaining({
        params: expect.objectContaining({ status: 'published' }),
      }));
    });
  });

  it('searches posts', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: mockPosts });

    renderWithProviders(<PostsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/posts', expect.objectContaining({
        params: expect.objectContaining({ search: 'test query' }),
      }));
    }, { timeout: 1000 });
  });

  it('deletes post with confirmation', async () => {
    const mockGet = vi.mocked(api.get);
    const mockDelete = vi.mocked(api.delete);
    
    mockGet.mockResolvedValueOnce({ data: mockPosts });
    mockDelete.mockResolvedValueOnce({ data: { message: 'Deleted' } });

    window.confirm = vi.fn(() => true);

    renderWithProviders(<PostsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Post 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
  });
});
