import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';

describe('useAuthStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        });
    });

    it('should have initial state', () => {
        const { result } = renderHook(() => useAuthStore());

        expect(result.current.user).toBeNull();
        expect(result.current.token).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
    });

    it('should set user and token on login', () => {
        const { result } = renderHook(() => useAuthStore());

        const mockUser = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin',
        };
        const mockToken = 'test-token-123';

        act(() => {
            result.current.setUser(mockUser);
            result.current.setToken(mockToken);
        });

        expect(result.current.user).toEqual(mockUser);
        expect(result.current.token).toBe(mockToken);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear state on logout', () => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
            result.current.setUser({ id: 1, name: 'Test', email: 'test@example.com', role: 'admin' });
            result.current.setToken('token');
        });

        expect(result.current.isAuthenticated).toBe(true);

        act(() => {
            result.current.logout();
        });

        expect(result.current.user).toBeNull();
        expect(result.current.token).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set loading state', () => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
            result.current.setLoading(true);
        });

        expect(result.current.isLoading).toBe(true);

        act(() => {
            result.current.setLoading(false);
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should check if user has role', () => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
            result.current.setUser({ id: 1, name: 'Admin', email: 'admin@example.com', role: 'super_admin' });
        });

        expect(result.current.hasRole('super_admin')).toBe(true);
        expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should check if user has any role', () => {
        const { result } = renderHook(() => useAuthStore());

        act(() => {
            result.current.setUser({ id: 1, name: 'Editor', email: 'editor@example.com', role: 'editor' });
        });

        expect(result.current.hasAnyRole(['admin', 'editor'])).toBe(true);
        expect(result.current.hasAnyRole(['admin', 'super_admin'])).toBe(false);
    });

    it('should persist state to localStorage', () => {
        const { result } = renderHook(() => useAuthStore());

        const mockUser = { id: 1, name: 'Test', email: 'test@example.com', role: 'admin' };

        act(() => {
            result.current.setUser(mockUser);
            result.current.setToken('token-123');
        });

        const stored = localStorage.getItem('auth-storage');
        expect(stored).not.toBeNull();

        if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed.state.user).toEqual(mockUser);
            expect(parsed.state.token).toBe('token-123');
        }
    });
});
