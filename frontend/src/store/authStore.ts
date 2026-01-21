import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (user) => {
        set({ user });
      },

      login: async (email: string, password: string, rememberMe = false) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password,
          remember_me: rememberMe,
        });

        const { user, token } = response.data;
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
