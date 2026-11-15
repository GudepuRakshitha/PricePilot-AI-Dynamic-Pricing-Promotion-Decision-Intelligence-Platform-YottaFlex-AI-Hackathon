import { useEffect, useState } from "react";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { dateLabel, money, num, pct } from "../lib/format";
import type {
  AnalyticsSummary,
  CategoryPerformance,
  DecisionList,
  ExceptionList,
  InventoryRisk,
  TopProduct,
  ValidationReport,
} from "../types";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui";
import { RevenueTrendChart, MarginTrendChart, CategoryChart, StatusPieChart } from "../components/charts";
import { CHART_COLORS } from "../lib/constants";

export default function Analytics() {
  const { user } = useAuth();
  const toast = useToast();

  const summary = useApiQuery<AnalyticsSummary>(
    () => api.get<AnalyticsSummary>("/analytics/summary").then((r) => r.data),
  );
  const categories = useApiQuery<CategoryPerformance[]>(
    () => api.get<CategoryPerformance[]>("/analytics/categories").then((r) => r.data),
  );
  const topProducts = useApiQuery<TopProduct[]>(
    () => api.get<TopProduct[]>("/analytics/top-products", { params: { limit: 6 } }).then((r) => r.data),
  );
  const decisions = useApiQuery<DecisionList>(
    () => api.get<DecisionList>("/decisions", { params: { limit: 6 } }).then((r) => r.data),
  );
  const exceptions = useApiQuery<ExceptionList>(
    () => api.get<ExceptionList>("/exceptions", { params: { limit: 5 } }).then((r) => r.data),
  );
  const inventory = useApiQuery<InventoryRisk>(
    () => api.get<InventoryRisk>("/analytics/inventory-risk").then((r) => r.data),
  );
  const validation = useApiQuery<ValidationReport>(
    () => api.get<ValidationReport>("/analytics/validation").then((r) => r.data),
  );

  const reloadAll = () => {
    summary.reload();
    categories.reload();
    topProducts.reload();
    decisions.reload();
    exceptions.reload();
    inventory.reload();
    validation.reload();
  };

  if (summary.loading && !summary.data) {
    return <LoadingState label="Loading analytics from PostgreSQL…" />;
  }
  if (summary.error) {
    return <ErrorState message={summary.error} onRetry={summary.reload} />;
  }
  if (!summary.data) {
    return (
      <EmptyState
        title="No analytics yet"
        message="Seed the starter dataset to populate the analytics dashboard."
      />
    );
  }

  const dash = summary.data.dashboard;
  const decisionData = decisions.data?.counts ?? {};
  const validationChecks = validation.data?.checks ?? [];
  const validationPassed = validationChecks.filter((c) => c.passed).length;

  const statusChart = [
    { name: "Approved", value: decisionData.APPROVED ?? 0 },
    { name: "Blocked", value: decisionData.BLOCKED ?? 0 },
    { name: "Flagged", value: decisionData.FLAGGED ?? 0 },
    { name: "Pending", value: decisionData.PENDING ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calculator}
        title="Analytics & Reports"
        subtitle="Live derived metrics from the connected PostgreSQL database."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={reloadAll}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-900">
        <span className="shrink-0" />
        <span className="font-semibold">Historical + decision metrics</span>
        <span className="text-brand-700/80">
          Revenue and margin derive from customer orders. Decisions come from pricing runs.
          Simulated scenarios are labelled separately in the Simulator.
        </span>
        <span className="ml-auto hidden rounded-full bg-white px-2.5 py-1 font-bold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-200 sm:inline">
          as of {new Date(summary.data.generated_at).toLocaleDateString("en-IN")}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (historical)"
          value={moneyCompact(dash.revenue)}
          sub={`${num(dash.total_orders)} orders · ${num(dash.units_sold)} units`}
          icon={IndianRupee}
          tone="brand"
        />
        <StatCard
          label="Gross profit"
          value={moneyCompact(dash.gross_profit)}
          sub={`Gross margin ${pct(dash.average_profit_margin, 2)}`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label="Pricing decisions"
          value={num(dash.pricing_decisions)}
          sub={`${num(dash.decisions_approved)} approved · ${num(dash.decisions_blocked)} blocked`}
          icon={ClipboardCheck}
          tone="violet"
        />
        <StatCard
          label="Open exceptions"
          value={num(dash.open_exceptions)}
          sub={`${num(dash.competitor_price_deviations)} competitor deviations`}
          icon={AlertTriangle}
          tone={dash.open_exceptions > 0 ? "rose" : "emerald"}
        />
        <StatCard
          label="Products"
          value={num(dash.total_products)}
          sub="Active catalog SKUs"
          icon={Package}
          tone="slate"
        />
        <StatCard
          label="Active promotions"
          value={num(dash.active_promotions)}
          sub="Valid on the analysis date"
          icon={TicketPercent}
          tone="amber"
        />
        <StatCard
          label="Inventory value"
          value={moneyCompact(dash.inventory_value)}
          sub={`${num(inventory.data?.skus_tracked ?? 0)} SKUs tracked`}
          icon={Warehouse}
          tone="brand"
        />
        <StatCard
          label="Validation health"
          value={validation.data ? `${validationPassed}/${validationChecks.length}` : "—"}
          sub={validation.data?.passed ? "All data-quality checks passed" : "Review failing checks"}
          icon={ShieldCheck}
          tone={validation.data?.passed ? "emerald" : "rose"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2 p-5">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-3">Revenue & gross profit trend</h3>
          <span className="badge-blue">
            <BarChart3 className="h-3 w-3" /> Historical
          </span>
          {summary.data.revenue_trends.length > 0 ? (
            <RevenueTrendChart data={summary.data.revenue_trends} />
          ) : (
            <EmptyState title="No order history" message="Orders populate this trend line." />
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-3">Decision outcomes</h3>
          <StatusPieChart
            data={statusChart}
            colors={["#10b981", "#ef4444", "#f59e0b", "#94a3b8"]}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Acceptance rate</p>
              <p className="text-lg font-bold text-emerald-800">{pct(summary.data.engine.decision_acceptance_rate, 2)}</p>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Explanation coverage</p>
              <p className="text-lg font-bold text-brand-800">{pct(summary.data.engine.decision_explanation_coverage, 2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2 p-5">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-3">Category performance</h3>
          {categories.loading ? (
            <LoadingState />
          ) : categories.error ? (
            <ErrorState message={categories.error} onRetry={categories.reload} />
          ) : categories.data && categories.data.length > 0 ? (
            <CategoryChart data={categories.data} />
          ) : (
            <EmptyState title="No category sales" />
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-3">Gross margin trend</h3>
          {summary.data.profit_trends.length > 0 ? (
            <MarginTrendChart data={summary.data.profit_trends} />
          ) : (
            <EmptyState title="No margin history" />
          )}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Floor violation rate</span>
              <span className="font-semibold text-slate-900">{pct(summary.data.engine.price_floor_violation_rate, 2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Margin rule violations</span>
              <span className="font-semibold text-slate-900">{pct(summary.data.engine.minimum_margin_violation_rate, 2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Stale-data detection</span>
              <span className="font-semibold text-slate-900">{pct(summary.data.engine.stale_competitor_data_detection_rate, 2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2 p-5">
          <div className="flex items-center justify-between px-5 pb-1 pt-5">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-0">Top products by revenue</h3>
            <Link to="/products" className="text-xs font-semibold text-brand-600 hover:underline">
              All products
            </Link>
          </div>
          {topProducts.loading ? (
            <LoadingState />
          ) : topProducts.error ? (
            <ErrorState message={topProducts.error} onRetry={topProducts.reload} />
          ) : topProducts.data && topProducts.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">SKU</th>
                    <th className="th">Product</th>
                    <th className="th text-right">Revenue</th>
                    <th className="th text-right">Margin</th>
                    <th className="th text-right">Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.data.map((row) => (
                    <tr key={row.sku} className="hover:bg-slate-50/70">
                      <td className="td font-mono text-xs text-slate-500">{row.sku}</td>
                      <td className="td">
                        <p className="max-w-[220px] truncate font-medium text-slate-900">{row.name}</p>
                        <p className="text-[11px] text-slate-400">{row.category}</p>
                      </td>
                      <td className="td text-right font-semibold">{money(row.revenue)}</td>
                      <td className="td text-right">
                        <span
                          className={row.gross_margin_pct >= 20 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}
                        >
                          {pct(row.gross_margin_pct, 1)}
                        </span>
                      </td>
                      <td className="td text-right">{num(row.units_sold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No product sales yet" />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {validation.data ? (
          <>
            <p className="text-3xl font-bold text-slate-900">{validation.data.total_checks}</p>
            <p className="text-[11px] text-slate-500">checks executed</p>
            <Badge className={validation.data.passed ? "badge-green" : "badge-red"}>
              {validation.data.failed_checks ?? 0} failed
            </Badge>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${validationChecks.length ? (validationPassed / validationChecks.length) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {validationPassed} of {validationChecks.length} checks passed on the connected database.
            </p>
            <Link to="/analytics" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
              View full report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        ) : (
          <EmptyState title="No validation report" />
        )}
      </div>
    </div>
  );
}