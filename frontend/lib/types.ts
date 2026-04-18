/**
 * CAMP Shared Type Definitions.
 *
 * These types mirror backend Pydantic schemas for type-safe
 * frontend-backend communication.
 */

// --- Enums ---

export type UnitStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance' | 'blocked';
export type UnitLayoutType = 'retail' | 'kiosk' | 'food_court' | 'anchor' | 'common_area' | 'other';
export type ContractStatus = 'draft' | 'active' | 'expiring' | 'expired' | 'terminated' | 'renewed';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type WorkOrderStatus = 'open' | 'in_progress' | 'pending_parts' | 'completed' | 'cancelled' | 'closed';
export type WorkOrderCategory = 'hvac' | 'electrical' | 'plumbing' | 'elevator' | 'fire_safety' | 'cleaning' | 'security' | 'general' | 'other';

// --- Core Entities ---

export interface Mall {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  total_area?: number;
  status: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: number;
  mall_id: number;
  name: string;
  code: string;
  total_floors: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: number;
  building_id: number;
  floor_number: number;
  name: string;
  plan_image_url?: string;
  total_area?: number;
  description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HotspotData {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'polygon';
  points?: number[][];
}

export interface Unit {
  id: number;
  floor_id: number;
  code: string;
  name: string;
  layout_type: UnitLayoutType;
  status: UnitStatus;
  gross_area?: number;
  net_leasable_area?: number;
  ceiling_height?: number;
  hotspot_data?: HotspotData;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UnitWithContract extends Unit {
  tenant_name?: string;
  contract_status?: string;
  lease_end?: string;
}

export interface FloorPlan {
  id: number;
  floor_id: number;
  image_url: string;
  image_width?: number;
  image_height?: number;
  hotspots?: HotspotItem[];
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HotspotItem {
  unit_id: number;
  unit_code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape?: 'rect' | 'polygon';
  points?: number[][]; // polygon vertices [[x,y], ...]
  status_color?: string;
  // Enriched fields from render-data endpoint
  unit_status?: string;
  unit_name?: string;
  area?: number;
  tenant_name?: string;
  contract_status?: string;
  lease_start?: string;
  lease_end?: string;
  monthly_rent?: number;
}

export interface Tenant {
  id: number;
  name: string;
  type: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  business_license?: string;
  industry?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: number;
  tenant_ref_id: number;
  unit_id: number;
  contract_number: string;
  status: ContractStatus;
  lease_start: string;
  lease_end: string;
  monthly_rent?: number;
  management_fee?: number;
  deposit?: number;
  currency: string;
  payment_frequency: PaymentFrequency;
  ai_imported: boolean;
  ai_confidence_score?: number;
  source_file_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  contract_id: number;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  issued_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface WorkOrder {
  id: number;
  unit_id?: number;
  mall_id: number;
  title: string;
  description?: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  requested_by?: string;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

// --- AI Import Types ---

export interface ContractAIExtractedData {
  tenant_name: string;
  unit_code?: string;
  area?: number;
  monthly_rent?: number;
  deposit?: number;
  lease_start?: string;
  lease_end?: string;
  payment_terms?: string;
  confidence_score: number;
}

export interface ContractAIImportResponse {
  extracted_data: ContractAIExtractedData;
  matched_unit_id?: number;
  matched_unit_code?: string;
  match_confidence?: number;
  warnings: string[];
}

// --- Dashboard Types ---

export interface KPIMetric {
  value: number;
  change: number | null;
  unit: string;
}

export interface DashboardKPIs {
  occupancy_rate: KPIMetric;
  vacant_area: KPIMetric;
  monthly_revenue: KPIMetric;
  expiring_count: KPIMetric;
  leasing_completion: KPIMetric;
  lianfa_ratio: KPIMetric;
}

export interface DashboardStats {
  mall_id: number;
  mall_name: string;
  period: string;
  kpis: DashboardKPIs;
  summary: {
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    total_area: number;
    leased_area: number;
    total_tenants: number;
    active_contracts: number;
  };
}

export interface KanbanCard {
  unit_id: number;
  unit_code: string;
  area: number | null;
  floor_name: string;
  layout_type: string;
  tenant_name: string | null;
  brand_tier: string | null;
  vacancy_days: number | null;
  monthly_rent: number | null;
}

export interface KanbanColumn {
  id: string;
  title: string;
  unit_count: number;
  total_area: number;
  cards: KanbanCard[];
}

export interface KanbanData {
  columns: KanbanColumn[];
}

export interface LeasingPlan {
  id: number;
  mall_id: number;
  name: string;
  plan_type: string;
  description: string | null;
  target_area: number | null;
  target_units: number | null;
  completed_area: number;
  completed_units: number;
  status: string;
  owner: string | null;
  start_date: string;
  due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface MarketNews {
  id: number;
  mall_id: number | null;
  title: string;
  content: string | null;
  source: string | null;
  category: string;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// --- Dashboard Chart / Table Types ---

export interface VacancyBucketSchema {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface LeaseTermBucketSchema {
  term: string;
  count: number;
  area: number;
}

export interface BrandTierBucketSchema {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface ExpiringContractItem {
  contract_id: number;
  contract_number: string;
  unit_code: string;
  tenant_name: string | null;
  lease_end: string;
  days_remaining: number;
  monthly_rent: number | null;
  status: string;
}
