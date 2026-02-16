import api from '../apiClient';

export const postService = {
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

export default postService;
