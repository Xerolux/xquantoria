import api from '../apiClient';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('auth_token', data.token);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-storage');
    }
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  async requestPasswordReset(email: string) {
    const { data } = await api.post('/auth/password/reset-request', { email });
    return data;
  },

  async resetPassword(email: string, token: string, password: string, password_confirmation: string) {
    const { data } = await api.post('/auth/password/reset', {
      email,
      token,
      password,
      password_confirmation
    });
    return data;
  },

  async register(name: string, email: string, password: string, password_confirmation: string) {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      password_confirmation
    });
    return data;
  }
};

export default authService;
