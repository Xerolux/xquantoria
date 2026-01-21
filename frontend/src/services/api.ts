import axios, { type AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Bei 401 Unauthorized: Token abgelaufen oder ungültig
    if (error.response?.status === 401) {
      // Token und localStorage leeren
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-storage');

      // Zur Login-Seite weiterleiten (nur wenn nicht schon dort)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

const authService = {
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

const postService = {
  async getAll(params?: any) {
    const { data } = await api.get('/posts', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/posts/${id}`);
    return data;
  },

  async create(postData: any) {
    const { data } = await api.post('/posts', postData);
    return data;
  },

  async update(id: string | number, postData: any) {
    const { data } = await api.put(`/posts/${id}`, postData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/posts/${id}`);
  },

  async bulkDelete(ids: number[]) {
    await api.delete('/posts/bulk', { data: { ids } });
  },
};

const categoryService = {
  async getAll() {
    const { data } = await api.get('/categories');
    return data;
  },

  async create(categoryData: any) {
    const { data } = await api.post('/categories', categoryData);
    return data;
  },

  async update(id: string | number, categoryData: any) {
    const { data } = await api.put(`/categories/${id}`, categoryData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/categories/${id}`);
  },
};

const tagService = {
  async getAll() {
    const { data } = await api.get('/tags');
    return data;
  },

  async create(tagData: any) {
    const { data } = await api.post('/tags', tagData);
    return data;
  },

  async update(id: string | number, tagData: any) {
    const { data } = await api.put(`/tags/${id}`, tagData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/tags/${id}`);
  },
};

const mediaService = {
  async getAll(params?: any) {
    const { data } = await api.get('/media', { params });
    return data;
  },

  async upload(file: File, metadata?: any) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.alt_text) formData.append('alt_text', metadata.alt_text);
    if (metadata?.caption) formData.append('caption', metadata.caption);

    const { data } = await api.post('/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async update(id: string | number, metadata: any) {
    const formData = new FormData();
    if (metadata.alt_text !== undefined) formData.append('alt_text', metadata.alt_text);
    if (metadata.caption !== undefined) formData.append('caption', metadata.caption);

    const { data } = await api.post(`/media/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/media/${id}`);
  },
};

const downloadService = {
  async getAll() {
    const { data } = await api.get('/downloads');
    return data;
  },

  async upload(file: File, metadata: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    formData.append('access_level', metadata.access_level || 'public');
    if (metadata.expires_at) formData.append('expires_at', metadata.expires_at);

    const { data } = await api.post('/downloads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/downloads/${id}`);
  },

  getDownloadUrl(token: string) {
    return `${API_BASE_URL.replace('/api/v1', '')}/dl/${token}`;
  },
};

const userService = {
  async getAll() {
    const { data } = await api.get('/users');
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  async create(userData: any) {
    const { data } = await api.post('/users', userData);
    return data;
  },

  async update(id: string | number, userData: any) {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/users/${id}`);
  },
};

const analyticsService = {
  async track(postId?: number, pageUrl?: string) {
    await api.post('/analytics/track', {
      post_id: postId,
      page_url: pageUrl,
    });
  },

  async getStats(period: string = '7 days') {
    const { data } = await api.get('/analytics/stats', { params: { period } });
    return data;
  },

  async getPostStats(postId: number) {
    const { data } = await api.get(`/analytics/posts/${postId}`);
    return data;
  },

  async export(period: string = '30 days') {
    const { data } = await api.get('/analytics/export', {
      params: { period },
      responseType: 'blob',
    });
    return data;
  },
};

const searchService = {
  async search(query: string, filters?: any) {
    const { data } = await api.get('/search', {
      params: { q: query, ...filters },
    });
    return data;
  },

  async getSuggestions(query: string) {
    const { data } = await api.get('/search/suggestions', {
      params: { q: query },
    });
    return data;
  },

  async getRelatedPosts(postId: number) {
    const { data } = await api.get(`/search/related/${postId}`);
    return data;
  },

  async getTrending(limit: number = 10) {
    const { data } = await api.get('/search/trending', {
      params: { limit },
    });
    return data;
  },

  async advancedSearch(params: any) {
    const { data } = await api.get('/search/advanced', { params });
    return data;
  },
};

const adService = {
  async getAll() {
    const { data } = await api.get('/ads');
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/ads/${id}`);
    return data;
  },

  async create(adData: any) {
    const { data } = await api.post('/ads', adData);
    return data;
  },

  async update(id: string | number, adData: any) {
    const { data } = await api.put(`/ads/${id}`, adData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/ads/${id}`);
  },
};

const pageService = {
  async getAll(params?: any) {
    const { data } = await api.get('/pages', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/pages/${id}`);
    return data;
  },

  async getBySlug(slug: string) {
    const { data } = await api.get(`/pages/${slug}`);
    return data;
  },

  async create(pageData: any) {
    const { data } = await api.post('/pages', pageData);
    return data;
  },

  async update(id: string | number, pageData: any) {
    const { data } = await api.put(`/pages/${id}`, pageData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/pages/${id}`);
  },

  async getMenu() {
    const { data } = await api.get('/pages/menu');
    return data;
  },
};

const commentService = {
  async getAll(params?: any) {
    const { data } = await api.get('/comments', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/comments/${id}`);
    return data;
  },

  async create(commentData: any) {
    const { data } = await api.post('/comments', commentData);
    return data;
  },

  async update(id: string | number, commentData: any) {
    const { data } = await api.put(`/comments/${id}`, commentData);
    return data;
  },

  async approve(id: number) {
    const { data } = await api.post(`/comments/${id}/approve`);
    return data;
  },

  async reject(id: number) {
    const { data } = await api.post(`/comments/${id}/reject`);
    return data;
  },

  async markAsSpam(id: number) {
    const { data } = await api.post(`/comments/${id}/spam`);
    return data;
  },

  async delete(id: number) {
    await api.delete(`/comments/${id}`);
  },
};

const newsletterService = {
  async getAll(params?: any) {
    const { data } = await api.get('/newsletters', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/newsletters/${id}`);
    return data;
  },

  async create(newsletterData: any) {
    const { data } = await api.post('/newsletters', newsletterData);
    return data;
  },

  async update(id: string | number, newsletterData: any) {
    const { data } = await api.put(`/newsletters/${id}`, newsletterData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/newsletters/${id}`);
  },

  async send(id: number) {
    const { data } = await api.post(`/newsletters/${id}/send`);
    return data;
  },

  async getStats() {
    const { data } = await api.get('/newsletters/stats');
    return data;
  },

  // Subscribers
  async getSubscribers(params?: any) {
    const { data } = await api.get('/newsletter/subscribers', { params });
    return data;
  },

  async getSubscriber(id: string | number) {
    const { data } = await api.get(`/newsletter/subscribers/${id}`);
    return data;
  },

  async updateSubscriber(id: string | number, subscriberData: any) {
    const { data } = await api.put(`/newsletter/subscribers/${id}`, subscriberData);
    return data;
  },

  async deleteSubscriber(id: string | number) {
    await api.delete(`/newsletter/subscribers/${id}`);
  },

  async exportSubscribers() {
    const { data } = await api.get('/newsletter/subscribers/export', {
      responseType: 'blob',
    });
    return data;
  },

  // Public subscription
  async subscribe(email: string, firstName?: string, lastName?: string) {
    const { data } = await api.post('/newsletter/subscribe', {
      email,
      first_name: firstName,
      last_name: lastName,
    });
    return data;
  },
};

const seoService = {
  async getRobotsTxt() {
    const { data } = await api.get('/seo/robots');
    return data;
  },

  async updateRobotsTxt(content: string) {
    const { data } = await api.put('/seo/robots', { content });
    return data;
  },

  async validateRobotsTxt(content: string) {
    const { data } = await api.post('/seo/robots/validate', { content });
    return data;
  },

  async resetRobotsTxt() {
    const { data } = await api.post('/seo/robots/reset');
    return data;
  },

  getSitemapUrl() {
    return `${window.location.origin}/sitemap.xml`;
  },

  getRobotsTxtUrl() {
    return `${window.location.origin}/robots.txt`;
  },
};

const twoFactorService = {
  async getStatus() {
    const { data } = await api.get('/2fa/status');
    return data;
  },

  async setup() {
    const { data } = await api.post('/2fa/setup');
    return data;
  },

  async confirm(code: string) {
    const { data } = await api.post('/2fa/confirm', { code });
    return data;
  },

  async verify(code: string) {
    const { data } = await api.post('/2fa/verify', { code });
    return data;
  },

  async disable(password: string, code?: string) {
    const { data } = await api.post('/2fa/disable', { password, code });
    return data;
  },

  async getRecoveryCodes() {
    const { data } = await api.get('/2fa/recovery-codes');
    return data;
  },

  async regenerateRecoveryCodes(password: string) {
    const { data } = await api.post('/2fa/recovery-codes/regenerate', { password });
    return data;
  },
};

const backupService = {
  async getAll(params?: any) {
    const { data } = await api.get('/backups', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/backups/${id}`);
    return data;
  },

  async create(backupData: any) {
    const { data } = await api.post('/backups', backupData);
    return data;
  },

  async download(id: string | number) {
    const url = `${window.location.origin}/api/v1/backups/${id}/download`;
    window.open(url, '_blank');
  },

  async restore(id: string | number, options: any) {
    const { data } = await api.post(`/backups/${id}/restore`, {
      ...options,
      confirm: true,
    });
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/backups/${id}`);
  },

  async getStats() {
    const { data } = await api.get('/backups/stats');
    return data;
  },
};

const settingsService = {
  async getAll(params?: any) {
    const { data } = await api.get('/settings', { params });
    return data;
  },

  async get(key: string) {
    const { data } = await api.get(`/settings/${key}`);
    return data;
  },

  async update(key: string, value: any) {
    const { data } = await api.put(`/settings/${key}`, { value });
    return data;
  },

  async updateBulk(settings: { key: string; value: any }[]) {
    const { data } = await api.post('/settings/bulk', { settings });
    return data;
  },

  async reset(key: string) {
    const { data } = await api.post(`/settings/${key}/reset`);
    return data;
  },

  async getPublic() {
    const { data } = await api.get('/settings/public');
    return data;
  },
};

const activityLogService = {
  async getAll(params?: any) {
    const { data } = await api.get('/activity-logs', { params });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get(`/activity-logs/${id}`);
    return data;
  },

  async getStats() {
    const { data } = await api.get('/activity-logs/stats');
    return data;
  },

  async export(params?: any) {
    const url = `${window.location.origin}/api/v1/activity-logs/export`;
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    window.open(url + queryString, '_blank');
  },

  async clean(days: number = 90) {
    const { data } = await api.post('/activity-logs/clean', { days });
    return data;
  },
};

const systemHealthService = {
  async getHealth() {
    const { data } = await api.get('/system/health');
    return data;
  },

  async ping() {
    const { data } = await api.get('/system/ping');
    return data;
  },
};

const aiService = {
  async generateContent(options: any) {
    const { data } = await api.post('/ai/generate-content', options);
    return data;
  },

  async generateSummary(content: string) {
    const { data } = await api.post('/ai/generate-summary', { content });
    return data;
  },

  async generateKeywords(title: string, content: string) {
    const { data } = await api.post('/ai/generate-keywords', { title, content });
    return data;
  },

  async generateMetaDescription(content: string) {
    const { data } = await api.post('/ai/generate-meta-description', { content });
    return data;
  },

  async suggestRelatedPosts(title: string, content: string) {
    const { data } = await api.post('/ai/suggest-related', { title, content });
    return data;
  },

  async proofreadContent(content: string) {
    const { data } = await api.post('/ai/proofread', { content });
    return data;
  },

  async generateContentIdeas(topic: string) {
    const { data } = await api.post('/ai/generate-ideas', { topic });
    return data;
  },
};

// Session Management Service
const sessionService = {
  async getAll() {
    const { data } = await api.get('/sessions');
    return data;
  },

  async revoke(tokenId: number) {
    const { data } = await api.delete(`/sessions/${tokenId}`);
    return data;
  },

  async revokeAll() {
    const { data } = await api.delete('/sessions');
    return data;
  },

  async heartbeat() {
    const { data } = await api.post('/sessions/heartbeat');
    return data;
  },
};

// Workflow Service
const workflowService = {
  async getStats() {
    const { data } = await api.get('/workflow/stats');
    return data;
  },

  async getEditorialCalendar(year: number, month: number) {
    const { data } = await api.get('/workflow/calendar', {
      params: { year, month },
    });
    return data;
  },

  async assignUser(postId: number, userId: number, role: 'author' | 'reviewer' | 'editor') {
    const { data } = await api.post(`/workflow/posts/${postId}/assign`, {
      user_id: userId,
      role,
    });
    return data;
  },

  async submitForReview(postId: number) {
    const { data } = await api.post(`/workflow/posts/${postId}/submit`);
    return data;
  },

  async approvePost(postId: number, feedback?: string) {
    const { data } = await api.post(`/workflow/posts/${postId}/approve`, {
      feedback,
    });
    return data;
  },

  async requestChanges(postId: number, feedback: string) {
    const { data } = await api.post(`/workflow/posts/${postId}/request-changes`, {
      feedback,
    });
    return data;
  },

  async getSEOScore(postId: number) {
    const { data } = await api.get(`/workflow/posts/${postId}/seo-score`);
    return data;
  },
};

// Social Media Service
const socialMediaService = {
  async getStats() {
    const { data } = await api.get('/social-media/stats');
    return data;
  },

  async sharePost(postId: number, platforms: string[], customMessage?: string, scheduledAt?: string) {
    const { data } = await api.post(`/social-media/posts/${postId}/share`, {
      platforms,
      custom_message: customMessage,
      scheduled_at: scheduledAt,
    });
    return data;
  },

  async scheduleShare(postId: number, platforms: string[], scheduledAt: string, customMessage?: string) {
    const { data } = await api.post(`/social-media/posts/${postId}/schedule`, {
      platforms,
      scheduled_at: scheduledAt,
      custom_message: customMessage,
    });
    return data;
  },

  async getPostShares(postId: number) {
    const { data } = await api.get(`/social-media/posts/${postId}/shares`);
    return data;
  },

  async deleteShare(shareId: number) {
    const { data } = await api.delete(`/social-media/shares/${shareId}`);
    return data;
  },

  async batchShare(postIds: number[], platforms: string[]) {
    const { data } = await api.post('/social-media/batch-share', {
      post_ids: postIds,
      platforms,
    });
    return data;
  },
};

// Schedule Service
const scheduleService = {
  async getAll(params?: any) {
    const { data } = await api.get('/schedule', { params });
    return data;
  },

  async getStats() {
    const { data } = await api.get('/schedule/stats');
    return data;
  },

  async getCalendar(year: number, month: number) {
    const { data } = await api.get('/schedule/calendar', {
      params: { year, month },
    });
    return data;
  },

  async schedulePost(postId: number, publishedAt: string) {
    const { data } = await api.post(`/schedule/posts/${postId}`, {
      published_at: publishedAt,
    });
    return data;
  },

  async reschedulePost(postId: number, publishedAt: string) {
    const { data } = await api.put(`/schedule/posts/${postId}/reschedule`, {
      published_at: publishedAt,
    });
    return data;
  },

  async cancelScheduledPost(postId: number) {
    const { data } = await api.delete(`/schedule/posts/${postId}/cancel`);
    return data;
  },

  async checkOverdue() {
    const { data } = await api.post('/schedule/check-overdue');
    return data;
  },
};

// Language Service
const languageService = {
  async getAll() {
    const { data } = await api.get('/languages');
    return data;
  },

  async getCurrent() {
    const { data } = await api.get('/languages/current');
    return data;
  },

  async getStats() {
    const { data } = await api.get('/languages/stats');
    return data;
  },

  async setLanguage(locale: string) {
    const { data } = await api.post('/languages/set', { locale });
    return data;
  },

  async getTranslations(postId?: number) {
    const { data } = await api.get('/languages/translations', {
      params: { post_id: postId },
    });
    return data;
  },

  async createTranslation(postId: number, locale: string, title: string, content: string) {
    const { data } = await api.post('/languages/translations', {
      post_id: postId,
      locale,
      title,
      content,
    });
    return data;
  },

  async getLocalizedUrl(locale: string, url?: string) {
    const { data } = await api.get('/languages/localize-url', {
      params: { locale, url },
    });
    return data;
  },
};

// Post Revisions Service
const postRevisionService = {
  async getAll(postId: number, params?: any) {
    const { data } = await api.get(`/posts/${postId}/revisions`, { params });
    return data;
  },

  async get(postId: number, revisionId: number) {
    const { data } = await api.get(`/posts/${postId}/revisions/${revisionId}`);
    return data;
  },

  async create(postId: number, data: any) {
    const { response } = await api.post(`/posts/${postId}/revisions`, data);
    return response;
  },

  async getStats(postId: number) {
    const { data } = await api.get(`/posts/${postId}/revisions/stats`);
    return data;
  },

  async compare(postId: number, fromId: number, toId: number) {
    const { data } = await api.get(`/posts/${postId}/revisions/compare`, {
      params: { from: fromId, to: toId },
    });
    return data;
  },

  async checkConflict(postId: number, editedAt: string) {
    const { data } = await api.get(`/posts/${postId}/revisions/check-conflict`, {
      params: { edited_at: editedAt },
    });
    return data;
  },

  async restore(postId: number, revisionId: number) {
    const { data } = await api.post(`/posts/${postId}/revisions/${revisionId}/restore`);
    return data;
  },

  async delete(postId: number, revisionId: number) {
    await api.delete(`/posts/${postId}/revisions/${revisionId}`);
  },
};

// Image Processing Service
const imageProcessingService = {
  async generateThumbnails(mediaId: number) {
    const { data } = await api.post(`/media/${mediaId}/thumbnails`);
    return data;
  },

  async crop(mediaId: number, x: number, y: number, width: number, height: number) {
    const { data } = await api.post(`/media/${mediaId}/crop`, {
      x, y, width, height,
    });
    return data;
  },

  async resize(mediaId: number, width: number, height: number) {
    const { data } = await api.post(`/media/${mediaId}/resize`, {
      width, height,
    });
    return data;
  },

  async rotate(mediaId: number, degrees: number) {
    const { data } = await api.post(`/media/${mediaId}/rotate`, {
      degrees,
    });
    return data;
  },

  async flip(mediaId: number, direction: 'horizontal' | 'vertical') {
    const { data } = await api.post(`/media/${mediaId}/flip`, {
      direction,
    });
    return data;
  },

  async optimize(mediaId: number) {
    const { data } = await api.post(`/media/${mediaId}/optimize`);
    return data;
  },

  async convertToWebP(mediaId: number) {
    const { data } = await api.post(`/media/${mediaId}/convert-webp`);
    return data;
  },

  async generateBlurhash(mediaId: number) {
    const { data } = await api.post(`/media/${mediaId}/blurhash`);
    return data;
  },

  async getSrcset(mediaId: number) {
    const { data } = await api.get(`/media/${mediaId}/srcset`);
    return data;
  },

  async batchOptimize(mediaIds: number[]) {
    const { data } = await api.post('/image-processing/batch-optimize', {
      media_ids: mediaIds,
    });
    return data;
  },

  async getStats() {
    const { data } = await api.get('/image-processing/stats');
    return data;
  },

  async generateAllBlurhashes() {
    const { data } = await api.post('/image-processing/generate-all-blurhashes');
    return data;
  },

  async autoOptimizeAll() {
    const { data } = await api.post('/image-processing/auto-optimize-all');
    return data;
  },
};

export default api;
export {
  authService,
  postService,
  categoryService,
  tagService,
  mediaService,
  downloadService,
  userService,
  analyticsService,
  searchService,
  adService,
  pageService,
  commentService,
  newsletterService,
  seoService,
  twoFactorService,
  backupService,
  settingsService,
  activityLogService,
  systemHealthService,
  aiService,
  sessionService,
  workflowService,
  socialMediaService,
  scheduleService,
  languageService,
  postRevisionService,
  imageProcessingService,
};
