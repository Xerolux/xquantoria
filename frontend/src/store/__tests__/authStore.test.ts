import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '../authStore';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as any;

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with empty state', () => {
    const authStore = useAuthStore();

    expect(authStore.user).toBeNull();
    expect(authStore.token).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
  });

  it('should login user successfully', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'admin' };
    const mockToken = 'test-token';

    mockedAxios.post.mockResolvedValue({
      data: { data: { user: mockUser, token: mockToken } },
    });

    const authStore = useAuthStore();

    await authStore.login('test@example.com', 'password');

    expect(authStore.user).toEqual(mockUser);
    expect(authStore.token).toBe(mockToken);
    expect(authStore.isAuthenticated).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockToken);
  });

  it('should handle login failure', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    const authStore = useAuthStore();

    await expect(authStore.login('test@example.com', 'wrongpassword')).rejects.toThrow();

    expect(authStore.isAuthenticated).toBe(false);
  });

  it('should logout user', async () => {
    const authStore = useAuthStore();

    // Set initial state
    authStore.user = { id: 1, email: 'test@example.com' } as any;
    authStore.token = 'test-token';
    authStore.isAuthenticated = true;

    mockedAxios.post.mockResolvedValue({ data: { data: { message: 'Logged out' } } });

    await authStore.logout();

    expect(authStore.user).toBeNull();
    expect(authStore.token).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('should fetch user profile', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

    mockedAxios.get.mockResolvedValue({
      data: { data: mockUser },
    });

    const authStore = useAuthStore();
    authStore.token = 'test-token';

    await authStore.fetchProfile();

    expect(authStore.user).toEqual(mockUser);
  });

  it('should update user profile', async () => {
    const authStore = useAuthStore();
    authStore.user = { id: 1, email: 'test@example.com', name: 'Old Name' } as any;

    const updatedUser = { id: 1, email: 'test@example.com', name: 'New Name' };

    mockedAxios.put.mockResolvedValue({
      data: { data: updatedUser },
    });

    await authStore.updateProfile({ name: 'New Name' });

    expect(authStore.user?.name).toBe('New Name');
  });

  it('should change password', async () => {
    const authStore = useAuthStore();
    authStore.token = 'test-token';

    mockedAxios.post.mockResolvedValue({
      data: { data: { message: 'Password changed' } },
    });

    await authStore.changePassword('oldpassword', 'newpassword');

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/change-password', {
      current_password: 'oldpassword',
      new_password: 'newpassword',
    });
  });

  it('should check if user has permission', () => {
    const authStore = useAuthStore();
    authStore.user = { role: 'admin' } as any;

    expect(authStore.hasPermission('admin')).toBe(true);
    expect(authStore.hasPermission('editor')).toBe(true);
    expect(authStore.hasPermission('author')).toBe(true);
  });

  it('should return false for insufficient permissions', () => {
    const authStore = useAuthStore();
    authStore.user = { role: 'author' } as any;

    expect(authStore.hasPermission('admin')).toBe(false);
    expect(authStore.hasPermission('author')).toBe(true);
  });

  it('should handle remember me in login', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    const mockToken = 'test-token';

    mockedAxios.post.mockResolvedValue({
      data: { data: { user: mockUser, token: mockToken } },
    });

    const authStore = useAuthStore();

    await authStore.login('test@example.com', 'password', true);

    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
      remember_me: true,
    });
  });

  it('should initialize with token from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('stored-token');

    mockedAxios.get.mockResolvedValue({
      data: { data: { id: 1, email: 'test@example.com' } },
    });

    const authStore = useAuthStore();

    // This would normally happen in the store constructor or init
    authStore.checkAuth();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('auth_token');
  });
});
