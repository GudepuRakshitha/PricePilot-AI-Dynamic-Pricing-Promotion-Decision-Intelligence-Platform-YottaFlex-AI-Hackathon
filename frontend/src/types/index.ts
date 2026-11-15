export type Role = "ADMIN" | "PRICING_MANAGER" | "ANALYST";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_minutes: number;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  brand: string;
  lifecycle_state: "ACTIVE" | "RETIRED" | "PLANNED";
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductList {
  items: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProductFacets {
  categories: string[];
  brands: string[];
}

export interface ProductOverview {
  product: Product;
  current_cost: number | null;
  current_price: number | null;
  price_floor: number | null;
  price_ceiling: number | null;
  margin_pct: number | null;
  inventory: {
    snapshot_id: string;
    snapshot_date: string;
    quantity_available: number;
    reserved_quantity: number;
    reorder_point: number;
    stockout_risk: boolean;
  } | null;
  latest_competitor: {
    competitor: string;
    observed_price: number;
    observed_at: string;
    is_stale: boolean;
    stale_reason: string | null;
  } | null;
  active_promotions: Array<{
    promotion_id: string;
    name: string;
    code: string;
    status: string;
    discount_type: string;
    discount_value: number;
    start_date: string;
    end_date: string;
  }>;
  recent_price_history: Array<{
    price_id: string;
    effective_date: string;
    selling_price: number;
    source: string;
    change_reason: string | null;
  }>;
  recent_decisions: Array<{
    decision_id: string;
    status: string;
    recommended_price: number;
    expected_margin: number;
    created_at: string;
  }>;
}

export interface CostRecord {
  cost_id: string;
  sku: string;
  effective_date: string;
  cost_amount: number;
  source: string;
  change_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostList {
  items: CostRecord[];
  total: number;
  current_cost_by_sku: Record<string, number>;
}

export interface InventorySnapshot {
  snapshot_id: string;
  sku: string;
  snapshot_date: string;
  quantity_available: number;
  reserved_quantity: number;
  reorder_point: number;
  stockout_risk: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryList {
  items: InventorySnapshot[];
  total: number;
  latest_by_sku: Record<
    string,
    {
      snapshot_id: string;
      snapshot_date: string;
      quantity_available: number;
      reserved_quantity: number;
      reorder_point: number;
      stockout_risk: boolean;
    }
  >;
}

export interface CompetitorObservation {
  observation_id: string;
  sku: string;
  competitor: string;
  competitor_sku: string | null;
  observed_price: number;
  observed_at: string;
  source: string;
  is_stale: boolean;
  stale_reason: string | null;
}

export interface CompetitorList {
  items: CompetitorObservation[];
  total: number;
  skip: number;
  limit: number;
  competitors: string[];
}

export interface CompetitorPosition {
  sku: string;
  competitor: string;
  observed_price: number;
  observed_at: string;
  our_price: number | null;
  deviation_pct: number | null;
  is_stale: boolean;
  stale_reason: string | null;
  position: "BELOW_MARKET" | "AT_MARKET" | "ABOVE_MARKET";
}

export interface Promotion {
  promotion_id: string;
  name: string;
  code: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  min_purchase_value: number;
  applicable_categories: string[];
  applicable_brands: string[];
  coupon_exclusions: string[];
  stacking_allowed: boolean;
  max_discount_percent: number;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED";
  created_at: string;
  updated_at: string;
}

export interface PromotionList {
  items: Promotion[];
  total: number;
  skip: number;
  limit: number;
  counts: Record<string, number>;
}

export interface PromotionEligibility {
  promotion_id: string;
  sku: string;
  eligible: boolean;
  reason: string;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  min_purchase_value: number;
  stacking_conflicts: string[];
}

export interface ConstraintCheck {
  rule_code: string;
  passed: boolean;
  detail: string;
  severity: string;
}

export interface Scenario {
  scenario_id: string;
  name: string;
  demand_level: string;
  available_stock: number;
  competitor_price: number | null;
  promotion_id: string | null;
  candidate_price: number;
  final_price: number;
  discount_percent: number;
  expected_margin: number;
  estimated_revenue: number;
  estimated_gross_profit: number;
  constraints: ConstraintCheck[];
  explanation: string;
  status: "APPROVED" | "BLOCKED" | "PENDING" | "FLAGGED";
}

export interface SimulationResponse {
  sku: string;
  base_price: number;
  cost: number;
  scenarios: Scenario[];
  recommended_scenario_id: string | null;
}

export interface Decision {
  decision_id: string;
  sku: string;
  previous_price: number;
  recommended_price: number;
  applied_discount: number;
  cost_basis: number;
  expected_margin: number;
  competitor_reference: string | null;
  inventory_signal: Record<string, unknown>;
  demand_signal: Record<string, unknown>;
  applicable_rules: Record<string, unknown>;
  status: "APPROVED" | "BLOCKED" | "PENDING" | "FLAGGED";
  reason: string | null;
  exception_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecisionList {
  items: Decision[];
  total: number;
  skip: number;
  limit: number;
  counts: Record<string, number>;
}

export interface ExceptionRecord {
  exception_id: string;
  decision_id: string | null;
  issue_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sku: string;
  description: string;
  expected_behavior: string;
  actual_behavior: string;
  resolution_status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export interface ExceptionList {
  items: ExceptionRecord[];
  total: number;
  skip: number;
  limit: number;
  counts: Record<string, number>;
}

export interface TrendPoint {
  date: string;
  revenue: number;
  gross_profit: number;
  gross_margin_pct: number;
  orders: number;
  units_sold?: number;
  avg_selling_price: number;
}

export interface DashboardMetrics {
  total_products: number;
  active_promotions: number;
  pricing_decisions: number;
  decisions_approved: number;
  decisions_blocked: number;
  average_profit_margin: number;
  revenue: number;
  gross_profit: number;
  inventory_value: number;
  competitor_price_deviations: number;
  open_exceptions: number;
  units_sold: number;
  total_orders: number;
}

export interface EngineMetrics {
  price_floor_violation_rate: number;
  price_ceiling_violation_rate: number;
  minimum_margin_violation_rate: number;
  promotion_rule_violation_rate: number;
  decision_acceptance_rate: number;
  decision_explanation_coverage: number;
  stale_competitor_data_detection_rate: number;
}

export interface DataQualityMetrics {
  primary_key_uniqueness: number;
  foreign_key_integrity: number;
  duplicate_record_rate: number;
  missing_required_field_rate: number;
  arithmetic_reconciliation_accuracy: number;
  lifecycle_validation_rate: number;
  reproducibility_checksum_match: number;
}

export interface SystemPerformance {
  api_response_time_p50_ms: number;
  api_response_time_p95_ms: number;
  dataset_generation_time_seconds: number;
  pricing_simulation_execution_time_ms: number;
  api_error_rate: number;
  test_pass_rate: number;
}

export interface AnalyticsSummary {
  period: string;
  generated_at: string;
  dashboard: DashboardMetrics;
  revenue_trends: TrendPoint[];
  profit_trends: TrendPoint[];
  engine: EngineMetrics;
  data_quality: DataQualityMetrics;
  system: SystemPerformance;
  kpis: Record<string, unknown>;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  gross_profit: number;
  gross_margin_pct: number;
  units_sold: number;
  orders: number;
}

export interface TopProduct {
  sku: string;
  name: string;
  category: string;
  revenue: number;
  gross_profit: number;
  gross_margin_pct: number;
  units_sold: number;
}

export interface InventoryRisk {
  skus_tracked: number;
  total_units_available: number;
  inventory_value: number;
  below_reorder_count: number;
  overstock_count: number;
  at_risk: Array<{
    sku: string;
    reason: string;
    quantity_available: number;
    reorder_point: number;
  }>;
}

export interface ValidationCheck {
  check: string;
  passed: boolean;
  details: string;
}

export interface ValidationReport {
  dataset_mode?: string;
  checks: ValidationCheck[];
  passed: boolean;
  total_checks: number;
  failed_checks: number;
  generated_at?: string;
  checksum?: string;
}

export interface AuditEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditList {
  items: AuditEntry[];
  total: number;
  skip: number;
  limit: number;
}

export interface AuditFacets {
  entity_types: string[];
  actions: string[];
  actors: string[];
}

export interface SystemSettings {
  app_name: string;
  app_version: string;
  environment: string;
  as_of_date: string;
  database_dialect: string;
  auto_seed: boolean;
  cors_origins: string[];
  pricing_rules: {
    min_profit_margin_pct: number;
    max_profit_margin_pct: number;
    price_floor_buffer_pct: number;
    price_ceiling_buffer_pct: number;
    competitor_freshness_days: number;
    stale_deviation_threshold_pct: number;
    demand_high_multiplier: number;
    demand_medium_multiplier: number;
    demand_low_multiplier: number;
    inventory_discount_max_pct: number;
    inventory_overstock_multiplier: number;
  };
  data_sources: Array<{ name: string; table: string; source: string }>;
  seeded_at: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserList {
  items: AppUser[];
  total: number;
}

export interface DatabaseHealth {
  status: string;
  dialect: string;
  server_version: string;
  tables: Record<string, number>;
}

export interface OrderSample {
  order_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  revenue: number;
  cost: number;
  order_date: string;
}
