/** Dashboard-specific API client methods */
import { apiClient } from './api';

export const dashboardApi = {
  // Core KPI stats
  async getStats(mallId: number) {
    return apiClient.get(`/dashboard/stats?mall_id=${mallId}`);
  },

  // Kanban board data
  async getKanban(mallId: number, params?: { floor_id?: number; status?: string }) {
    const search = new URLSearchParams({ mall_id: String(mallId), ...params });
    return apiClient.get(`/dashboard/kanban?${search}`);
  },

  // Move unit (drag & drop)
  async moveUnit(unitId: number, newStatus: string) {
    return apiClient.put('/dashboard/kanban/move', { unit_id: unitId, new_status: newStatus });
  },

  // Vacancy analysis
  async getVacancy(mallId: number) {
    return apiClient.get(`/dashboard/vacancy?mall_id=${mallId}`);
  },

  // Lease term distribution
  async getLeaseTerm(mallId: number) {
    return apiClient.get(`/dashboard/lease-term?mall_id=${mallId}`);
  },

  // Brand tier distribution
  async getBrandTier(mallId: number) {
    return apiClient.get(`/dashboard/brand-tier?mall_id=${mallId}`);
  },

  // Expiring contracts
  async getExpiring(mallId: number, days = 30) {
    return apiClient.get(`/dashboard/expiring?mall_id=${mallId}&days=${days}`);
  },

  // Plans CRUD
  async listPlans(params?: Record<string, unknown>) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && search.set(k, String(v)));
    return apiClient.get(`/plans?${search}`);
  },
  async getPlan(id: number) {
    return apiClient.get(`/plans/${id}`);
  },
  async createPlan(data: Record<string, unknown>) {
    return apiClient.post('/plans', data);
  },
  async updatePlan(id: number, data: Record<string, unknown>) {
    return apiClient.put(`/plans/${id}`, data);
  },
  async deletePlan(id: number) {
    return apiClient.delete(`/plans/${id}`);
  },

  // News CRUD
  async listNews(params?: Record<string, unknown>) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && search.set(k, String(v)));
    return apiClient.get(`/news?${search}`);
  },
  async getNews(id: number) {
    return apiClient.get(`/news/${id}`);
  },
  async createNews(data: Record<string, unknown>) {
    return apiClient.post('/news', data);
  },
  async updateNews(id: number, data: Record<string, unknown>) {
    return apiClient.put(`/news/${id}`, data);
  },
  async deleteNews(id: number) {
    return apiClient.delete(`/news/${id}`);
  },
  async togglePublish(id: number, isPublished: boolean) {
    return apiClient.put(`/news/${id}/publish`, { is_published: isPublished });
  },
};
