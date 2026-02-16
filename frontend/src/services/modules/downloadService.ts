import api, { API_BASE_URL_EXPORT } from '../apiClient';

interface DownloadMetadata {
  title: string;
  description?: string;
  access_level?: 'public' | 'registered' | 'premium';
  expires_at?: string;
}

export const downloadService = {
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
    return `${API_BASE_URL_EXPORT.replace('/api/v1', '')}/dl/${token}`;
  },
};

export default downloadService;
