/** Dashboard-specific API client methods */
import { apiClient } from './api';

const BASE = '/api/v1';

export const dashboardApi = {
  // Core KPI stats
  async getStats(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/stats?mall_id=${mallId}`);
  },

  // Kanban board data
  async getKanban(mallId: number, params?: { floor_id?: number; status?: string }) {
    const search = new URLSearchParams({ mall_id: String(mallId) });
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.set(k, String(v));
    });
    return apiClient.request(`${BASE}/dashboard/kanban?${search}`);
  },

  // Move unit (drag & drop)
  async moveUnit(unitId: number, newStatus: string) {
    return apiClient.request(`${BASE}/dashboard/kanban/move`, {
      method: 'PUT',
      body: JSON.stringify({ unit_id: unitId, new_status: newStatus }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Vacancy analysis
  async getVacancy(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/vacancy?mall_id=${mallId}`);
  },

  // Lease term distribution
  async getLeaseTerm(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/lease-term?mall_id=${mallId}`);
  },

  // Brand tier distribution
  async getBrandTier(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/brand-tier?mall_id=${mallId}`);
  },

  // Expiring contracts
  async getExpiring(mallId: number, days = 30) {
    return apiClient.request(`${BASE}/dashboard/expiring?mall_id=${mallId}&days=${days}`);
  },

  // Plans CRUD
  async listPlans(params?: Record<string, unknown>) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && search.set(k, String(v)));
    return apiClient.request(`${BASE}/plans?${search}`);
  },
  async getPlan(id: number) {
    return apiClient.request(`${BASE}/plans/${id}`);
  },
  async createPlan(data: Record<string, unknown>) {
    return apiClient.request(`${BASE}/plans`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  async updatePlan(id: number, data: Record<string, unknown>) {
    return apiClient.request(`${BASE}/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  async deletePlan(id: number) {
    return apiClient.request(`${BASE}/plans/${id}`, { method: 'DELETE' });
  },

  // News CRUD
  async listNews(params?: Record<string, unknown>) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => v !== undefined && search.set(k, String(v)));
    return apiClient.request(`${BASE}/news?${search}`);
  },
  async getNews(id: number) {
    return apiClient.request(`${BASE}/news/${id}`);
  },
  async createNews(data: Record<string, unknown>) {
    return apiClient.request(`${BASE}/news`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  async updateNews(id: number, data: Record<string, unknown>) {
    return apiClient.request(`${BASE}/news/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  async deleteNews(id: number) {
    return apiClient.request(`${BASE}/news/${id}`, { method: 'DELETE' });
  },
  async togglePublish(id: number, isPublished: boolean) {
    return apiClient.request(`${BASE}/news/${id}/publish`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: isPublished }),
      headers: { 'Content-Type': 'application/json' },
    });
  },

  // Signing structure (new vs renewal)
  async getSigningStructure(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/signing-structure?mall_id=${mallId}`);
  },

  // Brand trend (with month-over-month change)
  async getBrandTrend(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/brand-trend?mall_id=${mallId}`);
  },

  // Project detail (4 cards)
  async getProjectDetail(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/project-detail?mall_id=${mallId}`);
  },

  // Tools - brands with metrics
  async getBrandsTool(mallId: number, params?: {
    search?: string;
    tier?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }) {
    const search = new URLSearchParams({ mall_id: String(mallId) });
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    });
    return apiClient.request(`${BASE}/dashboard/tools/brands?${search}`);
  },

  // Tools - units with leasing info
  async getUnitsTool(mallId: number, params?: {
    building_id?: number;
    floor_id?: number;
    status?: string;
    area_min?: number;
    area_max?: number;
    rent_min?: number;
    rent_max?: number;
    leasing_type?: string;
    layout_type?: string;
  }) {
    const search = new URLSearchParams({ mall_id: String(mallId) });
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    });
    return apiClient.request(`${BASE}/dashboard/tools/units?${search}`);
  },

  // Floor summary
  async getFloorSummary(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/floor-summary?mall_id=${mallId}`);
  },

  // Alert/warning aggregation panel
  async getAlerts(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/alerts?mall_id=${mallId}`);
  },

  // Leasing efficiency table (grouped by floor)
  async getEfficiency(mallId: number) {
    return apiClient.request(`${BASE}/dashboard/efficiency?mall_id=${mallId}`);
  },
};
