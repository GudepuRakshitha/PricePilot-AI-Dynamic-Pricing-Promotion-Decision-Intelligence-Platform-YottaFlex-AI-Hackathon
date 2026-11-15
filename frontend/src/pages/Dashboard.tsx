import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Calculator,
  ClipboardCheck,
  Gauge,
  IndianRupee,
  Package,
  Percent,
  RefreshCw,
  ShieldCheck,
  Swords,
  TicketPercent,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { api } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import type {
  AnalyticsSummary,
  CategoryPerformance,
  Decision,
  DecisionList,
  ExceptionList,
  InventoryRisk,
  TopProduct,
  ValidationReport,
} from "../types";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui";
import {
  CategoryChart,
  MarginTrendChart,
  RevenueTrendChart,
  StatusPieChart,
} from "../components/charts";
import {
  CHART_COLORS,
  statusBadgeClass,
} from "../lib/constants";
import { dateTimeLabel, money, moneyCompact, num, pct, titleCase } from "../lib/format";

export default function Dashboard() {
  const summary = useApiQuery<AnalyticsSummary>(() =>
    api.get<AnalyticsSummary>("/analytics/summary").then((r) => r.data),
  );
  const categories = useApiQuery<CategoryPerformance[]>(() =>
    api.get<CategoryPerformance[]>("/analytics/categories").then((r) => r.data),
  );
  const topProducts = useApiQuery<TopProduct[]>(() =>
    api.get<TopProduct[]>("/analytics/top-products", { params: { limit: 6 } }).then((r) => r.data),
  );
  const decisions = useApiQuery<DecisionList>(() =>
    api.get<DecisionList>("/decisions", { params: { limit: 6 } }).then((r) => r.data),
  );
  const exceptions = useApiQuery<ExceptionList>(() =>
    api.get<ExceptionList>("/exceptions", { params: { limit: 5 } }).then((r) => r.data),
  );
  const inventory = useApiQuery<InventoryRisk>(() =>
    api.get<InventoryRisk>("/analytics/inventory-risk").then((r) => r.data),
  );
  const validation = useApiQuery<ValidationReport>(() =>
    api.get<ValidationReport>("/analytics/validation").then((r) => r.data),
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
    return <LoadingState label="Loading executive dashboard from PostgreSQL…" />;
  }
  if (summary.error) {
    return <ErrorState message={summary.error} onRetry={summary.reload} />;
  }
  if (!summary.data) {
    return (
      <EmptyState
        title="No analytics yet"
        message="Seed the starter dataset to populate the executive dashboard."
      />
    );
  }

  const dash = summary.data.dashboard;
  const decisionData = decisions.data?.counts ?? {};
  const exceptionCounts = exceptions.data?.counts ?? {};
  const statusChart = [
    { name: "Approved", value: decisionData.APPROVED ?? 0 },
    { name: "Blocked", value: decisionData.BLOCKED ?? 0 },
    { name: "Flagged", value: decisionData.FLAGGED ?? 0 },
    { name: "Pending", value: decisionData.PENDING ?? 0 },
  ];
  const validationChecks = validation.data?.checks ?? [];
  const validationPassed = validationChecks.filter((check) => check.passed).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gauge}
        title="Executive Dashboard"
        subtitle="Margin-safe pricing performance across catalog, promotions and competitor signals. All metrics are live aggregates of stored PostgreSQL records."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={reloadAll}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link to="/simulator" className="btn-primary">
              <Calculator className="h-4 w-4" /> Run simulation
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-900">
        <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />
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
          sub={`${num(dash.competitor_price_deviations)} competitor deviations >10%`}
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
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue & gross profit trend"
            subtitle="Daily aggregates from customer orders in the connected database"
            action={
              <span className="badge-blue">
                <BarChart3 className="h-3 w-3" /> Historical
              </span>
            }
          />
          {summary.data.revenue_trends.length > 0 ? (
            <RevenueTrendChart data={summary.data.revenue_trends} />
          ) : (
            <EmptyState title="No order history" message="Orders populate this trend line." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Decision outcomes"
            subtitle="All stored pricing decisions"
            action={
              <Link to="/decisions" className="text-xs font-semibold text-brand-600 hover:underline">
                Open center
              </Link>
            }
          />
          <StatusPieChart
            data={statusChart}
            colors={["#10b981", "#ef4444", "#f59e0b", "#94a3b8"]}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Acceptance rate
              </p>
              <p className="text-lg font-bold text-emerald-800">
                {pct(summary.data.engine.decision_acceptance_rate, 2)}
              </p>
            </div>
            <div className="rounded-lg bg-brand-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                Explanation coverage
              </p>
              <p className="text-lg font-bold text-brand-800">
                {pct(summary.data.engine.decision_explanation_coverage, 2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Category performance"
            subtitle="Revenue and gross profit by product category"
          />
          {categories.loading ? (
            <LoadingState />
          ) : categories.error ? (
            <ErrorState message={categories.error} onRetry={categories.reload} />
          ) : categories.data && categories.data.length > 0 ? (
            <CategoryChart data={categories.data} />
          ) : (
            <EmptyState title="No category sales" />
          )}
        </Card>

        <Card>
          <CardHeader title="Gross margin trend" subtitle="Order-level margin by day" />
          {summary.data.profit_trends.length > 0 ? (
            <MarginTrendChart data={summary.data.profit_trends} />
          ) : (
            <EmptyState title="No margin history" />
          )}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Floor violation rate</span>
              <span className="font-semibold text-slate-900">
                {pct(summary.data.engine.price_floor_violation_rate, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Margin rule violations</span>
              <span className="font-semibold text-slate-900">
                {pct(summary.data.engine.minimum_margin_violation_rate, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Stale-data detection</span>
              <span className="font-semibold text-slate-900">
                {pct(summary.data.engine.stale_competitor_data_detection_rate, 2)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 pb-1 pt-5">
            <CardHeader title="Top products by revenue" subtitle="Derived from stored orders" />
            <Link
              to="/products"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
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
                          className={
                            row.gross_margin_pct >= 20
                              ? "font-semibold text-emerald-700"
                              : "font-semibold text-rose-600"
                          }
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
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Open exceptions"
              subtitle="Edge cases requiring attention"
              action={
                <Link to="/exceptions" className="text-xs font-semibold text-brand-600 hover:underline">
                  Manage
                </Link>
              }
            />
            {exceptions.loading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
                <Spinner className="h-4 w-4 text-brand-600" /> Loading exceptions…
              </div>
            ) : exceptions.data && exceptions.data.items.length > 0 ? (
              <ul className="space-y-2">
                {exceptions.data.items.slice(0, 4).map((item) => (
                  <li key={item.exception_id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={statusBadgeClass(item.severity)}>{item.severity}</Badge>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.exception_id}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-slate-800">
                      {titleCase(item.issue_type)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                      {item.description}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{item.sku}</span>
                      <Badge className={statusBadgeClass(item.resolution_status)}>
                        {item.resolution_status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No exceptions detected" icon={ShieldCheck} />
            )}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"].map((key) => (
                <div key={key} className="rounded-md bg-slate-50 px-1.5 py-1.5 text-center">
                  <p className="text-sm font-bold text-slate-900">{exceptionCounts[key] ?? 0}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                    {key.slice(0, 4)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Data quality" subtitle="Live validation suite" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {validation.data?.total_checks ?? 0}
                </p>
                <p className="text-[11px] text-slate-500">checks executed</p>
              </div>
              <Badge className={validation.data?.passed ? "badge-green" : "badge-red"}>
                {validation.data?.failed_checks ?? 0} failed
              </Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${
                    validationChecks.length
                      ? (validationPassed / validationChecks.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {validationPassed} of {validationChecks.length} checks passed on the connected
              database.
            </p>
            <Link
              to="/analytics"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
            >
              View full report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <CardHeader title="Recent pricing decisions" subtitle="Latest auditable records" />
          <Link to="/decisions" className="text-xs font-semibold text-brand-600 hover:underline">
            Decision center
          </Link>
        </div>
        {decisions.loading ? (
          <LoadingState />
        ) : decisions.error ? (
          <ErrorState message={decisions.error} onRetry={decisions.reload} />
        ) : decisions.data && decisions.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Decision</th>
                  <th className="th">SKU</th>
                  <th className="th text-right">Previous</th>
                  <th className="th text-right">Recommended</th>
                  <th className="th text-right">Margin</th>
                  <th className="th">Status</th>
                  <th className="th">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decisions.data.items.map((decision: Decision) => (
                  <tr key={decision.decision_id} className="hover:bg-slate-50/70">
                    <td className="td font-mono text-xs text-slate-500">{decision.decision_id}</td>
                    <td className="td font-mono text-xs">{decision.sku}</td>
                    <td className="td text-right">{money(decision.previous_price)}</td>
                    <td className="td text-right font-semibold">{money(decision.recommended_price)}</td>
                    <td className="td text-right">{pct(decision.expected_margin, 2)}</td>
                    <td className="td">
                      <Badge className={statusBadgeClass(decision.status)}>{decision.status}</Badge>
                    </td>
                    <td className="td text-xs text-slate-500">{dateTimeLabel(decision.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No decisions recorded"
            message="Run the simulator and save a decision to build history."
            action={
              <Link to="/simulator" className="btn-primary btn-sm">
                <Calculator className="h-3.5 w-3.5" /> Open simulator
              </Link>
            }
          />
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Above reorder point", value: inventory.data?.below_reorder_count ?? 0, icon: Boxes, tone: "rose" as const },
          { label: "Overstocked SKUs", value: inventory.data?.overstock_count ?? 0, icon: Warehouse, tone: "amber" as const },
          { label: "Competitor deviations", value: dash.competitor_price_deviations, icon: Swords, tone: "violet" as const },
          { label: "Gross margin", value: pct(dash.average_profit_margin, 2), icon: Percent, tone: "emerald" as const },
        ].map((item) => (
          <div key={item.label} className="card flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500">
              <item.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {item.label}
              </p>
              <p className="text-lg font-bold text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
