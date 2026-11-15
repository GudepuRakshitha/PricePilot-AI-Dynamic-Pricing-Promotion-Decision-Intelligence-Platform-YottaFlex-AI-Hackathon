import { useEffect, useState } from "react";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { require_admin } from "../context/AuthContext";
import { dateLabel, money, num } from "../lib/format";
import type { SystemSettings } from "../types";
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  Spinner,
} from "../components/ui";

export default function Settings() {
  const { user, loading } = useAuth();
  const toast = useToast();

  // Enforce admin-only access
  if (user?.role !== "ADMIN") {
    return (
      <>
        <div className="grid min-h-screen place-items-center bg-slate-50">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Badge className="badge-red h-4 w-4" /> Administrator role required
          </div>
        </div>
      </>
    );
  }

  const settings = useApiQuery<SystemSettings>(
    () => api.get<SystemSettings>("/system/settings").then((r) => r.data),
  );

  if (settings.loading && !settings.data) {
    return <LoadingState label="Loading system settings…" />;
  }
  if (settings.error) {
    return <ErrorState message={settings.error} onRetry={settings.reload} />;
  }
  if (!settings.data) {
    return (
      <EmptyState
        title="No settings found"
        message="The system has no configuration records."
      />
    );
  }

  const s = settings.data;

  const reloadAll = () => {
    settings.reload();
  };

  return (
    <>
      <PageHeader
        icon={Settings}
        title="System Settings"
        subtitle="Platform configuration. Only visible to administrators."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={reloadAll}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Platform configuration" subtitle="Non-secret operational settings" />
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Pricing rules" subtitle="Configure margin and floor/ceiling policies" />
          <DefinitionList
            items={[
              { label: "Min profit margin %", value: `${s.pricing_rules.min_profit_margin_pct}%` },
              { label: "Max profit margin %", value: `${s.pricing_rules.max_profit_margin_pct}%` },
              { label: "Price floor buffer %", value: `${s.pricing_rules.price_floor_buffer_pct}%` },
              { label: "Price ceiling buffer %", value: `${s.pricing_rules.price_ceiling_buffer_pct}%` },
              { label: "Competitor freshness days", value: `${s.pricing_rules.competitor_freshness_days}` },
              { label: "Stale deviation threshold %", value: `${s.pricing_rules.stale_deviation_threshold_pct}%` },
              { label: "Demand high multiplier", value: `${s.pricing_rules.demand_high_multiplier}` },
              { label: "Demand medium multiplier", value: `${s.pricing_rules.demand_medium_multiplier}` },
              { label: "Demand low multiplier", value: `${s.pricing_rules.demand_low_multiplier}` },
              { label: "Inventory discount max %", value: `${s.pricing_rules.inventory_discount_max_pct}%` },
              { label: "Inventory overstock multiplier", value: `${s.pricing_rules.inventory_overstock_multiplier}` },
            ]}
          />
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Data sources" subtitle="Registered data source identifiers" />
          <DefinitionList
            items={[
              { label: "Cost history", value: `table: ${s.data_sources[0].table}` },
              { label: "Inventory", value: `table: ${s.data_sources[1].table}` },
              { label: "Competitor prices", value: `table: ${s.data_sources[2].table}` },
              { label: "Orders", value: `table: ${s.data_sources[3].table}` },
              { label: "Promotions", value: `table: ${s.data_sources[4].table}` },
            ]}
          />
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Seeding" subtitle="Database seed status" />
          <DefinitionList
            items={[
              { label: "Seed status", value: s.seeded_at ? `Seeded ${dateLabel(s.seeded_at)}` : "Not yet seeded" },
              { label: "Auto-seed on startup", value: s.auto_seed ? "Enabled" : "Disabled" },
            ]}
          />
        </div>
      </Card>
    </>
  );
}