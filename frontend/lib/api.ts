/**
 * CAMP API Client - unified API communication layer.
 *
 * All frontend-to-backend communication MUST go through this client.
 * Do NOT use raw fetch() or axios directly.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        (typeof error.detail === 'string' ? error.detail : undefined) ||
          `API Error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // --- Mall APIs ---

  async listMalls(params?: { skip?: number; limit?: number }) {
    const query = params ? `?skip=${params.skip || 0}&limit=${params.limit || 100}` : '';
    return this.request<any[]>(`/api/v1/malls${query}`);
  }

  async getMall(id: number) {
    return this.request<any>(`/api/v1/malls/${id}`);
  }

  async createMall(data: any) {
    return this.request<any>('/api/v1/malls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMall(id: number, data: any) {
    return this.request<any>(`/api/v1/malls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Building APIs ---

  async listBuildings(mallId: number) {
    return this.request<any[]>(`/api/v1/malls/${mallId}/buildings`);
  }

  async createBuilding(mallId: number, data: any) {
    return this.request<any>(`/api/v1/malls/${mallId}/buildings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Floor APIs ---

  async listFloors(buildingId: number) {
    // Floors are accessed via building, we'll add a dedicated endpoint if needed
    return this.request<any[]>(`/api/v1/floors?building_id=${buildingId}`);
  }

  // --- Unit APIs ---

  async listUnits(params?: { floor_id?: number; status?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.floor_id) searchParams.set('floor_id', String(params.floor_id));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return this.request<any[]>(`/api/v1/units${query}`);
  }

  async getUnit(id: number) {
    return this.request<any>(`/api/v1/units/${id}`);
  }

  async createUnit(data: any) {
    return this.request<any>('/api/v1/units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUnit(id: number, data: any) {
    return this.request<any>(`/api/v1/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUnit(unitId: number) {
    const url = `${this.baseUrl}/api/v1/units/${unitId}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        (typeof error.detail === 'string' ? error.detail : undefined) || `Delete failed: ${response.status}`
      );
    }
    return response;
  }

  /** Update a unit's hotspot coordinates (position & size on floor plan) */
  async updateUnitHotspot(unitId: number, hotspotData: { x: number; y: number; width: number; height: number; shape?: string; points?: number[][] }) {
    return this.request<any>(`/api/v1/units/${unitId}/hotspot`, {
      method: 'PUT',
      body: JSON.stringify(hotspotData),
    });
  }

  async getUnitsWithHotspots(floorId: number) {
    return this.request<any>(`/api/v1/units/floor/${floorId}/with-hotspots`);
  }

  // --- Tenant APIs ---

  async listTenants(params?: { status?: string; search?: string; skip?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.skip) searchParams.set('skip', String(params.skip));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return this.request<any[]>(`/api/v1/tenants${query}`);
  }

  async getTenant(id: number) {
    return this.request<any>(`/api/v1/tenants/${id}`);
  }

  async createTenant(data: any) {
    return this.request<any>('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Contract APIs ---

  async listContracts(params?: { unit_id?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.unit_id) searchParams.set('unit_id', String(params.unit_id));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return this.request<any[]>(`/api/v1/contracts${query}`);
  }

  async getContract(id: number) {
    return this.request<any>(`/api/v1/contracts/${id}`);
  }

  async createContract(data: any) {
    return this.request<any>('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** AI-powered contract import */
  async aiImportContract(file: File, mallId: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mall_id', String(mallId));

    const url = `${this.baseUrl}/api/v1/contracts/import/ai`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        (typeof error.detail === 'string' ? error.detail : undefined) || `Import failed: ${response.status}`
      );
    }

    return response.json();
  }

  /** Confirm AI-imported contract */
  async confirmAiImport(data: {
    tenant_name?: string;
    unit_id: number;
    contract_number: string;
    lease_start: string;
    lease_end: string;
    monthly_rent?: number;
    deposit?: number;
    confidence_score?: number;
    source_file_name?: string;
    raw_data?: string;
  }) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}/api/v1/contracts/import/ai/confirm`;
    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        (typeof error.detail === 'string' ? error.detail : undefined) || `Confirm failed: ${response.status}`
      );
    }

    return response.json();
  }

  // --- Floor Plan APIs ---

  async listFloorPlans(floorId: number) {
    return this.request<any[]>(`/api/v1/floor-plans/floor/${floorId}`);
  }

  async uploadFloorPlan(floorId: number, file: File, hotspots?: any[]) {
    const formData = new FormData();
    formData.append('file', file);
    if (hotspots) {
      formData.append('hotspots_json', JSON.stringify(hotspots));
    }

    const url = `${this.baseUrl}/api/v1/floor-plans/floor/${floorId}/upload`;
    const response = await fetch(url, { method: 'POST', body: formData });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(
        (typeof error.detail === 'string' ? error.detail : undefined) || `Upload failed: ${response.status}`
      );
    }

    return response.json();
  }

  async updateHotspots(planId: number, hotspots: any[]) {
    return this.request<any>(`/api/v1/floor-plans/${planId}/hotspots`, {
      method: 'PUT',
      body: JSON.stringify(hotspots),
    });
  }

  /** Get render data for floor plan visualization */
  async getFloorPlanRenderData(planId: number) {
    return this.request<any>(`/api/v1/floor-plans/${planId}/render-data`);
  }

  // --- Finance APIs ---

  async listInvoices(params?: { contract_id?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.contract_id) searchParams.set('contract_id', String(params.contract_id));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return this.request<any[]>(`/api/v1/finance/invoices${query}`);
  }

  async createInvoice(data: any) {
    return this.request<any>('/api/v1/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPayments(params?: { invoice_id?: number }) {
    const query = params?.invoice_id ? `?invoice_id=${params.invoice_id}` : '';
    return this.request<any[]>(`/api/v1/finance/payments${query}`);
  }

  async createPayment(data: any) {
    return this.request<any>('/api/v1/finance/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Operations APIs ---

  async listWorkOrders(params?: {
    mall_id?: number;
    status?: string;
    priority?: string;
    category?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.mall_id) searchParams.set('mall_id', String(params.mall_id));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.category) searchParams.set('category', params.category);

    const query = searchParams.toString() ? `?${searchParams}` : '';
    return this.request<any[]>(`/api/v1/operations${query}`);
  }

  async createWorkOrder(data: any) {
    return this.request<any>('/api/v1/operations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWorkOrder(id: number) {
    return this.request<any>(`/api/v1/operations/${id}`);
  }

  async updateWorkOrder(id: number, data: any) {
    return this.request<any>(`/api/v1/operations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse };
