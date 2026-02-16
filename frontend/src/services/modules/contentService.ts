import api from '../apiClient';

export const categoryService = {
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

export const tagService = {
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

export default { categoryService, tagService };
