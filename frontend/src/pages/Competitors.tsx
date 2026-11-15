import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Minus,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Swords,
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite, statusBadgeClass } from "../lib/constants";
import { dateTimeLabel, money, num, pct } from "../lib/format";
import type {
  CompetitorList,
  CompetitorPosition,
  ProductList,
} from "../types";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
  Tabs,
} from "../components/ui";
import { PriceComparisonChart } from "../components/charts";

const observationSchema = z.object({
  sku: z.string().min(3, "Select or enter a valid SKU").max(32),
  competitor: z.string().min(2, "Competitor name is required").max(128),
  competitor_sku: z.string().max(64).optional().or(z.literal("")),
  observed_price: z
    .number({ invalid_type_error: "Enter a numeric price" })
    .positive("Price must be greater than zero"),
  observed_at: z.string().min(1, "Observation timestamp is required"),
  source: z.enum(["SCRAPING", "API", "MANUAL"]),
});

type ObservationValues = z.infer<typeof observationSchema>;

export default function Competitors() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("observations");
  const [competitor, setCompetitor] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const observations = useApiQuery<CompetitorList>(
    () =>
      api
        .get<CompetitorList>("/competitors", {
          params: {
            competitor: competitor || undefined,
            stale_only: staleOnly || undefined,
            skip: (page - 1) * pageSize,
            limit: pageSize,
          },
        })
        .then((r) => r.data),
    [competitor, staleOnly, page],
  );

  const positions = useApiQuery<{ items: CompetitorPosition[]; total: number }>(() =>
    api.get<{ items: CompetitorPosition[]; total: number }>("/competitors/positions", {
      params: { limit: 100 },
    }).then((r) => r.data),
  );

  const products = useApiQuery<ProductList>(() =>
    api.get<ProductList>("/products", { params: { limit: 200 } }).then((r) => r.data),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ObservationValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      sku: "",
      competitor: "ShopMart",
      competitor_sku: "",
      observed_price: 1000,
      observed_at: "2026-01-31T10:00",
      source: "MANUAL",
    },
  });

  const openModal = () => {
    setFormError(null);
    reset({
      sku: products.data?.items[0]?.sku ?? "",
      competitor: observations.data?.competitors[0] ?? "ShopMart",
      competitor_sku: "",
      observed_price: 1000,
      observed_at: "2026-01-31T10:00",
      source: "MANUAL",
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: ObservationValues) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/competitors/observations", {
        ...values,
        competitor_sku: values.competitor_sku || null,
        observed_at: values.observed_at.length === 16 ? `${values.observed_at}:00` : values.observed_at,
      });
      toast.success("Observation recorded", `${values.competitor} · ${values.sku}`);
      setModalOpen(false);
      observations.reload();
      positions.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Could not record observation", message);
    } finally {
      setSaving(false);
    }
  };

  const positionRows = positions.data?.items ?? [];
  const belowMarket = positionRows.filter((row) => row.position === "BELOW_MARKET").length;
  const aboveMarket = positionRows.filter((row) => row.position === "ABOVE_MARKET").length;
  const staleRows = positionRows.filter((row) => row.is_stale).length;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Swords}
        title="Competitors"
        subtitle="Observed competitor prices with freshness controls. Stale observations are flagged and excluded from pricing signals rather than trusted blindly."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                observations.reload();
                positions.reload();
              }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {canWrite(user?.role) && (
              <button type="button" className="btn-primary" onClick={openModal}>
                <Plus className="h-4 w-4" /> Record observation
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Observations (latest per SKU)"
          value={num(positions.data?.total ?? 0)}
          sub="Market position rows"
          icon={Radar}
          tone="brand"
        />
        <StatCard
          label="Priced below market"
          value={num(belowMarket)}
          sub="More than 2% below competitor"
          icon={ArrowDownRight}
          tone="emerald"
        />
        <StatCard
          label="Priced above market"
          value={num(aboveMarket)}
          sub="More than 2% above competitor"
          icon={ArrowUpRight}
          tone="amber"
        />
        <StatCard
          label="Stale observations"
          value={num(staleRows)}
          sub="Outside the freshness window"
          icon={Eye}
          tone={staleRows > 0 ? "rose" : "emerald"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { value: "observations", label: "Observations", count: observations.data?.total },
            { value: "positions", label: "Market position", count: positions.data?.total },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "observations" && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="input"
              value={competitor}
              onChange={(event) => {
                setCompetitor(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All competitors</option>
              {(observations.data?.competitors ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={staleOnly}
                onChange={(event) => {
                  setStaleOnly(event.target.checked);
                  setPage(1);
                }}
              />
              Stale only
            </label>
          </div>
        )}
      </div>

      {tab === "observations" ? (
        <Card padded={false}>
          {observations.loading ? (
            <LoadingState label="Loading competitor observations…" />
          ) : observations.error ? (
            <ErrorState message={observations.error} onRetry={observations.reload} />
          ) : (observations.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title="No observations match"
              message="Clear the filters or record a competitor observation."
              icon={Swords}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Observation</th>
                      <th className="th">SKU</th>
                      <th className="th">Competitor</th>
                      <th className="th">Competitor SKU</th>
                      <th className="th text-right">Observed price</th>
                      <th className="th">Source</th>
                      <th className="th">Observed at</th>
                      <th className="th">Freshness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(observations.data?.items ?? []).map((row) => (
                      <tr key={row.observation_id} className="hover:bg-slate-50/70">
                        <td className="td font-mono text-[11px] text-slate-500">
                          {row.observation_id}
                        </td>
                        <td className="td font-mono text-xs">{row.sku}</td>
                        <td className="td font-medium">{row.competitor}</td>
                        <td className="td font-mono text-xs text-slate-500">
                          {row.competitor_sku ?? "—"}
                        </td>
                        <td className="td text-right font-semibold">{money(row.observed_price)}</td>
                        <td className="td">
                          <Badge className="badge-slate">{row.source}</Badge>
                        </td>
                        <td className="td text-xs text-slate-500">
                          {dateTimeLabel(row.observed_at)}
                        </td>
                        <td className="td">
                          {row.is_stale ? (
                            <Badge className="badge-amber" title={row.stale_reason ?? undefined}>
                              Stale — excluded
                            </Badge>
                          ) : (
                            <Badge className="badge-green">Fresh</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={observations.data?.total ?? 0}
                onPageChange={setPage}
              />
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Our price vs latest competitor observation"
              subtitle="First 10 SKUs with a competitor observation"
            />
            {positions.loading ? (
              <LoadingState />
            ) : positions.error ? (
              <ErrorState message={positions.error} onRetry={positions.reload} />
            ) : positionRows.length > 0 ? (
              <PriceComparisonChart rows={positionRows} />
            ) : (
              <EmptyState title="No market positions yet" />
            )}
          </Card>

          <Card padded={false}>
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Market position table
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Deviation within ±2% is treated as at-market
                </p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Filter by SKU or competitor…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            {positions.loading ? (
              <LoadingState />
            ) : positions.error ? (
              <ErrorState message={positions.error} onRetry={positions.reload} />
            ) : positionRows.length === 0 ? (
              <EmptyState title="No positions to display" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">SKU</th>
                      <th className="th">Competitor</th>
                      <th className="th text-right">Our price</th>
                      <th className="th text-right">Competitor price</th>
                      <th className="th text-right">Deviation</th>
                      <th className="th">Position</th>
                      <th className="th">Observed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {positionRows
                      .filter((row) => {
                        const term = search.trim().toLowerCase();
                        if (!term) return true;
                        return (
                          row.sku.toLowerCase().includes(term) ||
                          row.competitor.toLowerCase().includes(term)
                        );
                      })
                      .map((row) => (
                        <tr key={`${row.sku}-${row.competitor}`} className="hover:bg-slate-50/70">
                          <td className="td font-mono text-xs">{row.sku}</td>
                          <td className="td">{row.competitor}</td>
                          <td className="td text-right font-semibold">{money(row.our_price)}</td>
                          <td className="td text-right">{money(row.observed_price)}</td>
                          <td className="td text-right">
                            <span
                              className={
                                row.deviation_pct === null
                                  ? "text-slate-400"
                                  : row.deviation_pct > 2
                                    ? "font-semibold text-rose-600"
                                    : row.deviation_pct < -2
                                      ? "font-semibold text-emerald-700"
                                      : "font-semibold text-slate-600"
                              }
                            >
                              {pct(row.deviation_pct, 2)}
                            </span>
                          </td>
                          <td className="td">
                            <Badge className={statusBadgeClass(row.position)}>
                              {row.position.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="td text-xs text-slate-500">
                            {dateTimeLabel(row.observed_at)}
                            {row.is_stale && (
                              <span className="ml-1 text-amber-600">· stale</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Card>
        <p className="text-sm font-semibold text-slate-900">Freshness policy</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Observations older than the configured freshness window are marked stale and excluded from
          the competitor signal in pricing decisions. Detection of stale data is measured on the
          Analytics page, and each stale observation produces a warning so pricing can proceed on
          verified inputs instead of silently using outdated prices.
        </p>
      </Card>

      <Modal
        open={modalOpen}
        title="Record competitor observation"
        description="Manual observation entry for market intelligence not covered by the scraper."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="observation-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} Save observation
            </button>
          </>
        }
      >
        <form id="observation-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" error={errors.sku?.message} htmlFor="obs-sku">
              <input
                id="obs-sku"
                className="input font-mono"
                list="observation-sku-list"
                placeholder="SKU-000001"
                {...register("sku")}
              />
              <datalist id="observation-sku-list">
                {(products.data?.items ?? []).map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field label="Competitor" error={errors.competitor?.message} htmlFor="competitor">
              <input
                id="competitor"
                className="input"
                list="competitor-list"
                placeholder="ShopMart"
                {...register("competitor")}
              />
              <datalist id="competitor-list">
                {(observations.data?.competitors ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Competitor SKU"
              error={errors.competitor_sku?.message}
              hint="Optional listing identifier"
              htmlFor="competitor_sku"
            >
              <input
                id="competitor_sku"
                className="input font-mono"
                placeholder="SM-10293"
                {...register("competitor_sku")}
              />
            </Field>
            <Field
              label="Observed price (₹)"
              error={errors.observed_price?.message}
              htmlFor="observed_price"
            >
              <input
                id="observed_price"
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                {...register("observed_price", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Observed at" error={errors.observed_at?.message} htmlFor="observed_at">
              <input
                id="observed_at"
                type="datetime-local"
                className="input"
                {...register("observed_at")}
              />
            </Field>
            <Field label="Source" error={errors.source?.message} htmlFor="source">
              <select id="source" className="input" {...register("source")}>
                <option value="MANUAL">Manual</option>
                <option value="SCRAPING">Web scraping</option>
                <option value="API">Partner API</option>
              </select>
            </Field>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Observations are matched to a SKU, then compared against our latest effective selling
            price to calculate deviation. The analysis date for freshness is 2026-01-31.
          </p>
        </form>
      </Modal>
    </div>
  );
}
