import api from '../apiClient';

interface MediaMetadata {
  alt_text?: string;
  caption?: string;
}

export const mediaService = {
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

export default mediaService;
