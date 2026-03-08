import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MediaPage } from '../../pages/MediaPage';
import * as api from '../../services/api';

vi.mock('../../services/api');

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>{children}</BrowserRouter>
        </QueryClientProvider>
    );
};

describe('MediaPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render media page title', () => {
        vi.spyOn(api, 'getMedia').mockResolvedValueOnce({
            data: [],
            meta: { current_page: 1, total: 0, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        expect(screen.getByText(/media library/i)).toBeInTheDocument();
    });

    it('should display media items in grid view', async () => {
        const mockMedia = [
            {
                id: 1,
                filename: 'image1.jpg',
                original_filename: 'Image 1.jpg',
                mime_type: 'image/jpeg',
                size: 1024,
                url: '/storage/media/image1.jpg',
                alt_text: 'Image 1',
                created_at: '2026-01-01T00:00:00Z',
            },
            {
                id: 2,
                filename: 'image2.png',
                original_filename: 'Image 2.png',
                mime_type: 'image/png',
                size: 2048,
                url: '/storage/media/image2.png',
                alt_text: 'Image 2',
                created_at: '2026-01-02T00:00:00Z',
            },
        ];

        vi.spyOn(api, 'getMedia').mockResolvedValueOnce({
            data: mockMedia,
            meta: { current_page: 1, total: 2, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Image 1.jpg')).toBeInTheDocument();
            expect(screen.getByText('Image 2.png')).toBeInTheDocument();
        });
    });

    it('should filter media by type', async () => {
        vi.spyOn(api, 'getMedia').mockResolvedValue({
            data: [],
            meta: { current_page: 1, total: 0, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        const imageFilter = screen.getByRole('button', { name: /images/i });
        fireEvent.click(imageFilter);

        await waitFor(() => {
            expect(api.getMedia).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'image' })
            );
        });
    });

    it('should search media by filename', async () => {
        vi.spyOn(api, 'getMedia').mockResolvedValue({
            data: [],
            meta: { current_page: 1, total: 0, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'vacation' } });

        await waitFor(() => {
            expect(api.getMedia).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'vacation' })
            );
        });
    });

    it('should toggle between grid and list view', async () => {
        vi.spyOn(api, 'getMedia').mockResolvedValueOnce({
            data: [],
            meta: { current_page: 1, total: 0, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        const listButton = screen.getByRole('button', { name: /list/i });
        fireEvent.click(listButton);

        expect(listButton).toHaveClass('ant-btn-primary');
    });

    it('should open upload modal when upload button is clicked', async () => {
        vi.spyOn(api, 'getMedia').mockResolvedValueOnce({
            data: [],
            meta: { current_page: 1, total: 0, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        const uploadButton = screen.getByRole('button', { name: /upload/i });
        fireEvent.click(uploadButton);

        await waitFor(() => {
            expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
        });
    });

    it('should show empty state when no media', async () => {
        vi.spyOn(api, 'getMedia').mockResolvedValueOnce({
            data: [],
            meta: { current_page: 1, total: 0, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText(/no media files/i)).toBeInTheDocument();
        });
    });

    it('should display pagination info', async () => {
        vi.spyOn(api, 'getMedia').mockResolvedValueOnce({
            data: [],
            meta: { current_page: 1, total: 50, per_page: 20 },
        });

        render(<MediaPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText(/50/i)).toBeInTheDocument();
        });
    });
});
