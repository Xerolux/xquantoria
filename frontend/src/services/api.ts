import axios from 'axios';

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
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/posts', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/posts/${id}`);
    return data;
  },

  async create(postData: Record<string, unknown>) {
    const { data } = await api.post('/posts', postData);
    return data;
  },

  async update(id: string | number, postData: Record<string, unknown>) {
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

  async create(categoryData: Record<string, unknown>) {
    const { data } = await api.post('/categories', categoryData);
    return data;
  },

  async update(id: string | number, categoryData: Record<string, unknown>) {
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

  async create(tagData: Record<string, unknown>) {
    const { data } = await api.post('/tags', tagData);
    return data;
  },

  async update(id: string | number, tagData: Record<string, unknown>) {
    const { data } = await api.put(`/tags/${id}`, tagData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/tags/${id}`);
  },
};

interface MediaMetadata {
  alt_text?: string;
  caption?: string;
}

const mediaService = {
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/media', { params });
    return data;
  },

  async upload(file: File, metadata?: MediaMetadata) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.alt_text) formData.append('alt_text', metadata.alt_text);
    if (metadata?.caption) formData.append('caption', metadata.caption);

    const { data } = await api.post('/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async update(id: string | number, metadata: MediaMetadata) {
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

interface DownloadMetadata {
  title: string;
  description?: string;
  access_level?: 'public' | 'registered' | 'premium';
  expires_at?: string;
}

const downloadService = {
  async getAll() {
    const { data } = await api.get('/downloads');
    return data;
  },

  async upload(file: File, metadata: DownloadMetadata) {
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

  async create(userData: Record<string, unknown>) {
    const { data } = await api.post('/users', userData);
    return data;
  },

  async update(id: string | number, userData: Record<string, unknown>) {
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
  async search(query: string, filters?: Record<string, unknown>) {
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

  async advancedSearch(params: Record<string, unknown>) {
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

  async create(adData: Record<string, unknown>) {
    const { data } = await api.post('/ads', adData);
    return data;
  },

  async update(id: string | number, adData: Record<string, unknown>) {
    const { data } = await api.put(`/ads/${id}`, adData);
    return data;
  },

  async delete(id: string | number) {
    await api.delete(`/ads/${id}`);
  },
};

const pageService = {
  async getAll(params?: Record<string, unknown>) {
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

  async create(pageData: Record<string, unknown>) {
    const { data } = await api.post('/pages', pageData);
    return data;
  },

  async update(id: string | number, pageData: Record<string, unknown>) {
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
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/comments', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/comments/${id}`);
    return data;
  },

  async create(commentData: Record<string, unknown>) {
    const { data } = await api.post('/comments', commentData);
    return data;
  },

  async update(id: string | number, commentData: Record<string, unknown>) {
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
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/newsletters', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/newsletters/${id}`);
    return data;
  },

  async create(newsletterData: Record<string, unknown>) {
    const { data } = await api.post('/newsletters', newsletterData);
    return data;
  },

  async update(id: string | number, newsletterData: Record<string, unknown>) {
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
  async getSubscribers(params?: Record<string, unknown>) {
    const { data } = await api.get('/newsletter/subscribers', { params });
    return data;
  },

  async getSubscriber(id: string | number) {
    const { data } = await api.get(`/newsletter/subscribers/${id}`);
    return data;
  },

  async updateSubscriber(id: string | number, subscriberData: Record<string, unknown>) {
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
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/backups', { params });
    return data;
  },

  async get(id: string | number) {
    const { data } = await api.get(`/backups/${id}`);
    return data;
  },

  async create(backupData: Record<string, unknown>) {
    const { data } = await api.post('/backups', backupData);
    return data;
  },

  async download(id: string | number) {
    const url = `${window.location.origin}/api/v1/backups/${id}/download`;
    window.open(url, '_blank');
  },

  async restore(id: string | number, options: Record<string, unknown>) {
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
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/settings', { params });
    return data;
  },

  async get(key: string) {
    const { data } = await api.get(`/settings/${key}`);
    return data;
  },

  async update(key: string, value: unknown) {
    const { data } = await api.put(`/settings/${key}`, { value });
    return data;
  },

  async updateBulk(settings: { key: string; value: unknown }[]) {
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
  async getAll(params?: Record<string, unknown>) {
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

  async export(params?: Record<string, unknown>) {
    const url = `${window.location.origin}/api/v1/activity-logs/export`;
    const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
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
  async generateFullArticle(options: {
    title?: string;
    topic: string;
    tone?: string;
    target_audience?: string;
    keywords?: string[];
    word_count?: number;
    outline?: string;
    research_points?: string[];
    temperature?: number;
  }) {
    const { data } = await api.post('/ai/generate-full-article', options);
    return data;
  },

  async generateContent(options: Record<string, unknown>) {
    const { data } = await api.post('/ai/generate-content', options);
    return data;
  },

  async generateSummary(content: string, max_length?: number) {
    const { data } = await api.post('/ai/generate-summary', { content, max_length });
    return data;
  },

  async optimizeSEO(title: string, content: string) {
    const { data } = await api.post('/ai/optimize-seo', { title, content });
    return data;
  },

  async generateTags(title: string, content: string, count?: number) {
    const { data } = await api.post('/ai/generate-tags', { title, content, count });
    return data;
  },

  async generateKeywords(title: string, content: string, count?: number) {
    const { data } = await api.post('/ai/generate-keywords', { title, content, count });
    return data;
  },

  async checkPlagiarism(content: string, existing_content?: any[]) {
    const { data } = await api.post('/ai/check-plagiarism', { content, existing_content });
    return data;
  },

  async analyzeSentiment(content: string) {
    const { data } = await api.post('/ai/analyze-sentiment', { content });
    return data;
  },

  async suggestHeadlines(topic: string, content?: string, count?: number) {
    const { data } = await api.post('/ai/suggest-headlines', { topic, content, count });
    return data;
  },

  async translateContent(content: string, target_language: string, source_language?: string) {
    const { data } = await api.post('/ai/translate-content', {
      content,
      target_language,
      source_language,
    });
    return data;
  },

  async generateImage(prompt: string, size?: string, style?: string) {
    const { data } = await api.post('/ai/generate-image', { prompt, size, style });
    return data;
  },

  async generateMetaDescription(content: string, max_length?: number) {
    const { data } = await api.post('/ai/generate-meta-description', { content, max_length });
    return data;
  },

  async suggestRelatedPosts(title: string, content: string, count?: number) {
    const { data } = await api.post('/ai/suggest-related', { title, content, count });
    return data;
  },

  async proofreadContent(content: string) {
    const { data } = await api.post('/ai/proofread', { content });
    return data;
  },

  async generateContentIdeas(topic: string, count?: number) {
    const { data } = await api.post('/ai/generate-ideas', { topic, count });
    return data;
  },

  async chat(messages: Array<{ role: string; content: string }>, options?: any) {
    const { data } = await api.post('/ai/chat', { messages, ...options });
    return data;
  },

  async ragChat(query: string, context_documents?: Array<{ title: string; content: string }>) {
    const { data } = await api.post('/ai/rag-chat', { query, context_documents });
    return data;
  },

  async checkAvailability() {
    const { data } = await api.get('/ai/check-availability');
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
  async getAll(params?: Record<string, unknown>) {
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
  async getAll(postId: number, params?: Record<string, unknown>) {
    const { data } = await api.get(`/posts/${postId}/revisions`, { params });
    return data;
  },

  async get(postId: number, revisionId: number) {
    const { data } = await api.get(`/posts/${postId}/revisions/${revisionId}`);
    return data;
  },

  async create(postId: number, revisionData: Record<string, unknown>) {
    const { data: response } = await api.post(`/posts/${postId}/revisions`, revisionData);
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

// Webhooks Service
const webhooksService = {
  async getAll(params?: any) {
    const { data } = await api.get('/webhooks', { params });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get(`/webhooks/${id}`);
    return data;
  },

  async create(webhookData: any) {
    const { data } = await api.post('/webhooks', webhookData);
    return data;
  },

  async update(id: number, webhookData: any) {
    const { data } = await api.put(`/webhooks/${id}`, webhookData);
    return data;
  },

  async delete(id: number) {
    await api.delete(`/webhooks/${id}`);
  },

  async getEvents() {
    const { data } = await api.get('/webhooks/events');
    return data;
  },

  async test(id: number) {
    const { data } = await api.post(`/webhooks/${id}/test`);
    return data;
  },

  async toggle(id: number) {
    const { data } = await api.post(`/webhooks/${id}/toggle`);
    return data;
  },

  async getLogs(id: number, params?: any) {
    const { data } = await api.get(`/webhooks/${id}/logs`, { params });
    return data;
  },

  async getLog(id: number, logId: number) {
    const { data } = await api.get(`/webhooks/${id}/logs/${logId}`);
    return data;
  },

  async retry(id: number, limit?: number) {
    const { data } = await api.post(`/webhooks/${id}/retry`, { limit });
    return data;
  },

  async regenerateSecret(id: number) {
    const { data } = await api.post(`/webhooks/${id}/regenerate-secret`);
    return data;
  },

  async getStats(id: number) {
    const { data } = await api.get(`/webhooks/${id}/stats`);
    return data;
  },
};

const publicService = {
  async homepage() {
    const { data } = await api.get('/public');
    return data;
  },

  async posts(params?: { page?: number; per_page?: number }) {
    const { data } = await api.get('/public/posts', { params });
    return data;
  },

  async post(slug: string) {
    const { data } = await api.get(`/public/posts/${slug}`);
    return data;
  },

  async category(slug: string, params?: { page?: number; per_page?: number }) {
    const { data } = await api.get(`/public/categories/${slug}`, { params });
    return data;
  },

  async tag(slug: string, params?: { page?: number; per_page?: number }) {
    const { data } = await api.get(`/public/tags/${slug}`, { params });
    return data;
  },

  async page(slug: string) {
    const { data } = await api.get(`/public/pages/${slug}`);
    return data;
  },

  async search(query: string, params?: { page?: number; per_page?: number }) {
    const { data } = await api.get('/public/search', { params: { q: query, ...params } });
    return data;
  },

  async feed() {
    const response = await api.get('/public/feed', { responseType: 'text' });
    return response.data;
  },

  async categories() {
    const { data } = await api.get('/public/categories');
    return data;
  },

  async tags() {
    const { data } = await api.get('/public/tags');
    return data;
  },
};

const pluginService = {
  async getAll(params?: Record<string, unknown>) {
    const { data } = await api.get('/plugins', { params });
    return data;
  },

  async get(id: number) {
    const { data } = await api.get(`/plugins/${id}`);
    return data;
  },

  async upload(formData: FormData) {
    const { data } = await api.post('/plugins/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async installFromMarketplace(marketplaceId: string) {
    const { data } = await api.post('/plugins/install-marketplace', {
      marketplace_id: marketplaceId,
    });
    return data;
  },

  async activate(id: number) {
    const { data } = await api.post(`/plugins/${id}/activate`);
    return data;
  },

  async deactivate(id: number) {
    const { data } = await api.post(`/plugins/${id}/deactivate`);
    return data;
  },

  async update(id: number, formData?: FormData) {
    const { data } = await api.post(`/plugins/${id}/update`, formData, {
      headers: formData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return data;
  },

  async uninstall(id: number, options?: { delete_data?: boolean }) {
    const { data } = await api.delete(`/plugins/${id}`, { data: options });
    return data;
  },

  async updateConfig(id: number, config: Record<string, unknown>) {
    const { data } = await api.put(`/plugins/${id}/config`, { config });
    return data;
  },

  async getSettings(id: number) {
    const { data } = await api.get(`/plugins/${id}/settings`);
    return data;
  },

  async updateSettings(id: number, settings: Record<string, unknown>) {
    const { data } = await api.put(`/plugins/${id}/settings`, settings);
    return data;
  },

  async toggleAutoUpdate(id: number) {
    const { data } = await api.post(`/plugins/${id}/toggle-auto-update`);
    return data;
  },

  async getStats() {
    const { data } = await api.get('/plugins/stats');
    return data;
  },

  async getPerformance() {
    const { data } = await api.get('/plugins/performance');
    return data;
  },

  async getHooks() {
    const { data } = await api.get('/plugins/hooks');
    return data;
  },

  async getHookStats() {
    const { data } = await api.get('/plugins/hooks/stats');
    return data;
  },

  async checkUpdates() {
    const { data } = await api.post('/plugins/check-updates');
    return data;
  },

  async runAutoUpdate() {
    const { data } = await api.post('/plugins/auto-update');
    return data;
  },

  async reorder(order: number[]) {
    const { data } = await api.post('/plugins/reorder', { order });
    return data;
  },

  async bulkAction(action: 'activate' | 'deactivate' | 'uninstall', ids: number[]) {
    const { data } = await api.post('/plugins/bulk', { action, ids });
    return data;
  },

  async exportConfig(id: number) {
    const { data } = await api.get(`/plugins/${id}/export-config`);
    return data;
  },

  async importConfig(id: number, config: Record<string, unknown>, settings?: Record<string, unknown>) {
    const { data } = await api.post(`/plugins/${id}/import-config`, { config, settings });
    return data;
  },

  async marketplaceSearch(params?: { search?: string; category?: string; page?: number }) {
    const { data } = await api.get('/plugins/marketplace/search', { params });
    return data;
  },

  async marketplaceGet(id: string) {
    const { data } = await api.get(`/plugins/marketplace/${id}`);
    return data;
  },

  async marketplaceCategories() {
    const { data } = await api.get('/plugins/marketplace/categories');
    return data;
  },

  async marketplaceFeatured() {
    const { data } = await api.get('/plugins/marketplace/featured');
    return data;
  },

  async marketplacePopular() {
    const { data } = await api.get('/plugins/marketplace/popular');
    return data;
  },

  async marketplaceNew() {
    const { data } = await api.get('/plugins/marketplace/new');
    return data;
  },
};

const shopService = {
  async getProducts(params?: Record<string, unknown>) {
    const { data } = await api.get('/shop/products', { params });
    return data;
  },

  async getProduct(slug: string) {
    const { data } = await api.get(`/shop/products/${slug}`);
    return data;
  },

  async getCategories() {
    const { data } = await api.get('/shop/categories');
    return data;
  },

  async getCategory(slug: string, params?: Record<string, unknown>) {
    const { data } = await api.get(`/shop/categories/${slug}`, { params });
    return data;
  },

  async getCart() {
    const { data } = await api.get('/shop/cart');
    return data;
  },

  async addToCart(productId: number, quantity: number = 1, attributes?: Record<string, unknown>) {
    const { data } = await api.post('/shop/cart/add', { product_id: productId, quantity, attributes });
    return data;
  },

  async updateCartItem(key: string, quantity: number) {
    const { data } = await api.put('/shop/cart/update', { key, quantity });
    return data;
  },

  async removeFromCart(key: string) {
    const { data } = await api.delete('/shop/cart/remove', { data: { key } });
    return data;
  },

  async clearCart() {
    const { data } = await api.delete('/shop/cart/clear');
    return data;
  },

  async applyCoupon(code: string) {
    const { data } = await api.post('/shop/coupon/apply', { code });
    return data;
  },

  async checkout(checkoutData: Record<string, unknown>) {
    const { data } = await api.post('/shop/checkout', checkoutData);
    return data;
  },

  async getOrders(params?: Record<string, unknown>) {
    const { data } = await api.get('/shop/orders', { params });
    return data;
  },

  async getOrder(id: number) {
    const { data } = await api.get(`/shop/orders/${id}`);
    return data;
  },

  async updateOrderStatus(id: number, status: string) {
    const { data } = await api.put(`/shop/orders/${id}/status`, { status });
    return data;
  },
};

const themeService = {
  async getAll() {
    const { data } = await api.get('/themes');
    return data;
  },

  async get(id: number) {
    const { data } = await api.get(`/themes/${id}`);
    return data;
  },

  async getActive() {
    const { data } = await api.get('/themes/active');
    return data;
  },

  async create(themeData: Record<string, unknown>) {
    const { data } = await api.post('/themes', themeData);
    return data;
  },

  async update(id: number, themeData: Record<string, unknown>) {
    const { data } = await api.put(`/themes/${id}`, themeData);
    return data;
  },

  async delete(id: number) {
    const { data } = await api.delete(`/themes/${id}`);
    return data;
  },

  async activate(id: number) {
    const { data } = await api.post(`/themes/${id}/activate`);
    return data;
  },

  async duplicate(id: number) {
    const { data } = await api.post(`/themes/${id}/duplicate`);
    return data;
  },

  async getSettings(id: number) {
    const { data } = await api.get(`/themes/${id}/settings`);
    return data;
  },

  async updateSetting(id: number, key: string, value: unknown) {
    const { data } = await api.post(`/themes/${id}/settings`, { key, value });
    return data;
  },

  async resetSettings(id: number) {
    const { data } = await api.delete(`/themes/${id}/settings`);
    return data;
  },

  async getTemplates(id: number) {
    const { data } = await api.get(`/themes/${id}/templates`);
    return data;
  },

  async createTemplate(id: number, templateData: Record<string, unknown>) {
    const { data } = await api.post(`/themes/${id}/templates`, templateData);
    return data;
  },

  async updateTemplate(themeId: number, templateId: number, templateData: Record<string, unknown>) {
    const { data } = await api.put(`/themes/${themeId}/templates/${templateId}`, templateData);
    return data;
  },

  async deleteTemplate(themeId: number, templateId: number) {
    const { data } = await api.delete(`/themes/${themeId}/templates/${templateId}`);
    return data;
  },

  async export(id: number) {
    const { data } = await api.get(`/themes/${id}/export`);
    return data;
  },

  async import(themeData: string) {
    const { data } = await api.post('/themes/import', { theme_data: themeData });
    return data;
  },
};

const formService = {
  async getAll() {
    const { data } = await api.get('/forms');
    return data;
  },

  async get(id: number) {
    const { data } = await api.get(`/forms/${id}`);
    return data;
  },

  async create(formData: Record<string, unknown>) {
    const { data } = await api.post('/forms', formData);
    return data;
  },

  async update(id: number, formData: Record<string, unknown>) {
    const { data } = await api.put(`/forms/${id}`, formData);
    return data;
  },

  async delete(id: number) {
    const { data } = await api.delete(`/forms/${id}`);
    return data;
  },

  async duplicate(id: number) {
    const { data } = await api.post(`/forms/${id}/duplicate`);
    return data;
  },

  async getSubmissions(formId: number, params?: Record<string, unknown>) {
    const { data } = await api.get(`/forms/${formId}/submissions`, { params });
    return data;
  },

  async getSubmission(formId: number, submissionId: number) {
    const { data } = await api.get(`/forms/${formId}/submissions/${submissionId}`);
    return data;
  },

  async markSubmissionRead(formId: number, submissionId: number) {
    const { data } = await api.post(`/forms/${formId}/submissions/${submissionId}/read`);
    return data;
  },

  async markSubmissionSpam(formId: number, submissionId: number) {
    const { data } = await api.post(`/forms/${formId}/submissions/${submissionId}/spam`);
    return data;
  },

  async deleteSubmission(formId: number, submissionId: number) {
    const { data } = await api.delete(`/forms/${formId}/submissions/${submissionId}`);
    return data;
  },

  async exportSubmissions(formId: number, format: string = 'csv') {
    const { data } = await api.get(`/forms/${formId}/export/${format}`);
    return data;
  },
};

const importExportService = {
  async exportPosts(params?: Record<string, unknown>) {
    const { data } = await api.get('/import-export/export/posts', { params });
    return data;
  },

  async exportCategories() {
    const { data } = await api.get('/import-export/export/categories');
    return data;
  },

  async exportTags() {
    const { data } = await api.get('/import-export/export/tags');
    return data;
  },

  async exportUsers() {
    const { data } = await api.get('/import-export/export/users');
    return data;
  },

  async exportAll() {
    const { data } = await api.get('/import-export/export/all');
    return data;
  },

  async importWordPress(file: File) {
    const formData = new FormData();
    formData.append('xml_file', file);
    const { data } = await api.post('/import-export/import/wordpress', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async importJson(importData: Record<string, unknown>) {
    const { data } = await api.post('/import-export/import/json', { data: importData });
    return data;
  },
};

const legalService = {
  async getDocuments(params?: Record<string, unknown>) {
    const { data } = await api.get('/legal-documents', { params });
    return data;
  },

  async getTypes() {
    const { data } = await api.get('/legal-documents/types');
    return data;
  },

  async getFormFields(type: string) {
    const { data } = await api.get(`/legal-documents/${type}/form-fields`);
    return data;
  },

  async preview(type: string, formData: Record<string, unknown>) {
    const { data } = await api.post(`/legal-documents/${type}/preview`, formData);
    return data;
  },

  async generate(type: string, formData: Record<string, unknown>) {
    const { data } = await api.post(`/legal-documents/${type}/generate`, formData);
    return data;
  },

  async getDocument(id: number) {
    const { data } = await api.get(`/legal-documents/${id}`);
    return data;
  },

  async updateDocument(id: number, docData: Record<string, unknown>) {
    const { data } = await api.put(`/legal-documents/${id}`, docData);
    return data;
  },

  async deleteDocument(id: number) {
    const { data } = await api.delete(`/legal-documents/${id}`);
    return data;
  },

  async publishDocument(id: number) {
    const { data } = await api.post(`/legal-documents/${id}/publish`);
    return data;
  },

  async unpublishDocument(id: number) {
    const { data } = await api.post(`/legal-documents/${id}/unpublish`);
    return data;
  },

  async duplicateDocument(id: number) {
    const { data } = await api.post(`/legal-documents/${id}/duplicate`);
    return data;
  },

  async exportDocument(id: number, format: string = 'html') {
    const { data } = await api.get(`/legal-documents/${id}/export/${format}`);
    return data;
  },
};

const paymentService = {
  async getConfig() {
    const { data } = await api.get('/payments/config');
    return data;
  },

  async createStripeIntent(orderId: number, options?: { return_url?: string; payment_method_types?: string[] }) {
    const { data } = await api.post('/payments/stripe/create-intent', {
      order_id: orderId,
      ...options,
    });
    return data;
  },

  async confirmStripePayment(paymentIntentId: string) {
    const { data } = await api.post('/payments/stripe/confirm', {
      payment_intent_id: paymentIntentId,
    });
    return data;
  },

  async createPayPalOrder(orderId: number, options?: { return_url?: string; cancel_url?: string }) {
    const { data } = await api.post('/payments/paypal/create-order', {
      order_id: orderId,
      ...options,
    });
    return data;
  },

  async capturePayPalOrder(paypalOrderId: string) {
    const { data } = await api.post('/payments/paypal/capture', {
      paypal_order_id: paypalOrderId,
    });
    return data;
  },

  async getTransactions(params?: { status?: string; gateway?: string; order_id?: number; date_from?: string; date_to?: string; per_page?: number }) {
    const { data } = await api.get('/payments/transactions', { params });
    return data;
  },

  async getTransaction(id: string) {
    const { data } = await api.get(`/payments/transactions/${id}`);
    return data;
  },

  async getStats() {
    const { data } = await api.get('/payments/stats');
    return data;
  },

  async getRefunds(params?: { status?: string; order_id?: number; per_page?: number }) {
    const { data } = await api.get('/payments/refunds', { params });
    return data;
  },

  async createRefund(transactionId: number, amount: number, reason?: string, reasonText?: string) {
    const { data } = await api.post('/payments/refund', {
      transaction_id: transactionId,
      amount,
      reason,
      reason_text: reasonText,
    });
    return data;
  },
};

const dashboardService = {
  async getStats() {
    const { data } = await api.get('/dashboard/stats');
    return data;
  },
};

const notificationService = {
  async getAll(params?: { limit?: number }) {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  async getUnreadCount() {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  },

  async markAsRead(id: number) {
    const { data } = await api.post(`/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead() {
    const { data } = await api.post('/notifications/read-all');
    return data;
  },

  async delete(id: number) {
    const { data } = await api.delete(`/notifications/${id}`);
    return data;
  },
};

const elasticsearchService = {
  async search(params: { q: string; index?: string; size?: number; from?: number; filters?: Record<string, unknown> }) {
    const { data } = await api.get('/elasticsearch/search', { params });
    return data;
  },

  async suggest(params: { q: string; index?: string; size?: number }) {
    const { data } = await api.get('/elasticsearch/suggest', { params });
    return data;
  },

  async getStatus() {
    const { data } = await api.get('/elasticsearch/status');
    return data;
  },

  async indexDocument(index: string, id: string | number, docData: Record<string, unknown>) {
    const { data } = await api.post('/elasticsearch/index', { index, id, data: docData });
    return data;
  },

  async bulkIndex(index: string, documents: Record<string, unknown>) {
    const { data } = await api.post('/elasticsearch/bulk', { index, documents });
    return data;
  },

  async deleteDocument(index: string, id: string | number) {
    const { data } = await api.delete('/elasticsearch/document', { data: { index, id } });
    return data;
  },

  async syncIndex(index: string) {
    const { data } = await api.post('/elasticsearch/sync', { index });
    return data;
  },

  async createIndices() {
    const { data } = await api.post('/elasticsearch/indices');
    return data;
  },

  async deleteIndices() {
    const { data } = await api.delete('/elasticsearch/indices');
    return data;
  },
};

const queueMonitorService = {
  getIndex() {
    return api.get('/queue-monitor');
  },

  getQueue(queue: string) {
    return api.get(`/queue-monitor/${queue}`);
  },

  retryFailedJob(id: number) {
    return api.post(`/queue-monitor/failed/${id}/retry`);
  },

  forgetFailedJob(id: number) {
    return api.delete(`/queue-monitor/failed/${id}`);
  },

  flushFailedJobs() {
    return api.delete('/queue-monitor/failed');
  },

  clearQueue(queue: string) {
    return api.delete(`/queue-monitor/${queue}/clear`);
  },

  pauseQueue(queue: string) {
    return api.post(`/queue-monitor/${queue}/pause`);
  },

  resumeQueue(queue: string) {
    return api.post(`/queue-monitor/${queue}/resume`);
  },
};

const schedulerService = {
  getIndex() {
    return api.get('/scheduler');
  },

  runScheduler(force = false) {
    return api.post('/scheduler/run', { force });
  },

  runTask(task: string) {
    return api.post(`/scheduler/tasks/${task}/run`);
  },

  enable() {
    return api.post('/scheduler/enable');
  },

  disable() {
    return api.post('/scheduler/disable');
  },

  clearHistory() {
    return api.delete('/scheduler/history');
  },
};

const performanceService = {
  getIndex() {
    return api.get('/performance');
  },

  getDatabase() {
    return api.get('/performance/database');
  },

  getCache() {
    return api.get('/performance/cache');
  },

  clearCache(type = 'all') {
    return api.post('/performance/cache/clear', { type });
  },

  optimize() {
    return api.post('/performance/optimize');
  },

  getOpcache() {
    return api.get('/performance/opcache');
  },

  resetOpcache() {
    return api.post('/performance/opcache/reset');
  },
};

const contentApprovalService = {
  getPending(params?: Record<string, unknown>) {
    return api.get('/content-approval/pending', { params });
  },

  getStats() {
    return api.get('/content-approval/stats');
  },

  approvePost(id: number, feedback?: string) {
    return api.post(`/content-approval/posts/${id}/approve`, { feedback });
  },

  rejectPost(id: number, reason: string) {
    return api.post(`/content-approval/posts/${id}/reject`, { reason });
  },

  requestChanges(id: number, feedback: string) {
    return api.post(`/content-approval/posts/${id}/request-changes`, { feedback });
  },

  approveComment(id: number) {
    return api.post(`/content-approval/comments/${id}/approve`);
  },

  rejectComment(id: number, reason?: string) {
    return api.post(`/content-approval/comments/${id}/reject`, { reason });
  },

  getHistory(params?: Record<string, unknown>) {
    return api.get('/content-approval/history', { params });
  },
};

const securityService = {
  getDashboard() {
    return api.get('/security/dashboard');
  },

  getStats() {
    return api.get('/security/stats');
  },

  getTwoFactorStats() {
    return api.get('/security/two-factor-stats');
  },

  getWafStats() {
    return api.get('/security/waf-stats');
  },

  getRecommendations() {
    return api.get('/security/recommendations');
  },

  getEvents(params?: Record<string, unknown>) {
    return api.get('/security/events', { params });
  },

  getEventTypes() {
    return api.get('/security/events/types');
  },

  getEvent(id: number) {
    return api.get(`/security/events/${id}`);
  },

  resolveEvent(id: number) {
    return api.post(`/security/events/${id}/resolve`);
  },

  resolveAllEvents(severity?: string) {
    return api.post('/security/events/resolve-all', { severity });
  },

  exportEvents(params?: Record<string, unknown>) {
    return api.get('/security/events/export', { params });
  },

  getBlockedIps(params?: Record<string, unknown>) {
    return api.get('/security/blocked-ips', { params });
  },

  getBlockTypes() {
    return api.get('/security/blocked-ips/types');
  },

  blockIp(data: { ip_address: string; reason: string; duration_minutes?: number; is_permanent?: boolean }) {
    return api.post('/security/blocked-ips', data);
  },

  checkIp(ip: string) {
    return api.get(`/security/check-ip/${ip}`);
  },

  unblockIp(ip: string) {
    return api.delete(`/security/blocked-ips/${ip}`);
  },

  deleteBlockedIp(id: number) {
    return api.delete(`/security/blocked-ips/id/${id}`);
  },

  getFailedLogins(params?: Record<string, unknown>) {
    return api.get('/security/failed-logins', { params });
  },

  getFailureReasons() {
    return api.get('/security/failed-logins/reasons');
  },

  getActiveSessions() {
    return api.get('/security/sessions');
  },

  terminateSession(sessionId: string) {
    return api.delete(`/security/sessions/${sessionId}`);
  },

  terminateAllSessions() {
    return api.delete('/security/sessions');
  },

  cleanOldRecords(days: number = 90) {
    return api.post('/security/clean-old-records', { days });
  },
};

const menuService = {
  getAll(params?: Record<string, unknown>) {
    return api.get('/menus', { params });
  },

  get(id: number) {
    return api.get(`/menus/${id}`);
  },

  create(data: Record<string, unknown>) {
    return api.post('/menus', data);
  },

  update(id: number, data: Record<string, unknown>) {
    return api.put(`/menus/${id}`, data);
  },

  delete(id: number) {
    return api.delete(`/menus/${id}`);
  },

  getByLocation(location: string) {
    return api.get(`/menus/location/${location}`);
  },

  getTree(id: number) {
    return api.get(`/menus/${id}`);
  },

  addItem(menuId: number, data: Record<string, unknown>) {
    return api.post(`/menus/${menuId}/items`, data);
  },

  updateItem(menuId: number, itemId: number, data: Record<string, unknown>) {
    return api.put(`/menus/${menuId}/items/${itemId}`, data);
  },

  deleteItem(menuId: number, itemId: number) {
    return api.delete(`/menus/${menuId}/items/${itemId}`);
  },

  reorder(menuId: number, items: Array<{ id: number; order: number; parent_id: number | null }>) {
    return api.post(`/menus/${menuId}/reorder`, { items });
  },

  getLinkableOptions(type: string, search?: string) {
    return api.get('/menus/linkable-options', { params: { type, search } });
  },
};

const redirectService = {
  getAll(params?: Record<string, unknown>) {
    return api.get('/redirects', { params });
  },

  get(id: number) {
    return api.get(`/redirects/${id}`);
  },

  create(data: Record<string, unknown>) {
    return api.post('/redirects', data);
  },

  update(id: number, data: Record<string, unknown>) {
    return api.put(`/redirects/${id}`, data);
  },

  delete(id: number) {
    return api.delete(`/redirects/${id}`);
  },

  bulkCreate(redirects: Array<Record<string, unknown>>) {
    return api.post('/redirects/bulk', { redirects });
  },

  bulkDelete(ids: number[]) {
    return api.delete('/redirects/bulk', { data: { ids } });
  },

  getStats() {
    return api.get('/redirects/stats');
  },

  toggle(id: number) {
    return api.post(`/redirects/${id}/toggle`);
  },

  resetHits(id: number) {
    return api.post(`/redirects/${id}/reset-hits`);
  },

  export() {
    return api.get('/redirects/export');
  },

  import(redirects: Array<Record<string, unknown>>) {
    return api.post('/redirects/import', { redirects });
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
  webhooksService,
  pluginService,
  publicService,
  shopService,
  themeService,
  formService,
  importExportService,
  legalService,
  paymentService,
  dashboardService,
  notificationService,
  elasticsearchService,
  queueMonitorService,
  schedulerService,
  performanceService,
  contentApprovalService,
  securityService,
  menuService,
  redirectService,
};
