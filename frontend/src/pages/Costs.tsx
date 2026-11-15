import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calculator,
  IndianRupee,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingDown,
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite } from "../lib/constants";
import { dateLabel, money, num, pct } from "../lib/format";
import type { CostList, ProductList } from "../types";
import {
  Badge,
  Card,
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
} from "../components/ui";

const costSchema = z.object({
  sku: z.string().min(3, "Select or enter a valid SKU").max(32),
  effective_date: z.string().min(1, "Effective date is required"),
  cost_amount: z.number({ invalid_type_error: "Enter a numeric cost" }).positive("Cost must be positive"),
  source: z.enum(["BASELINE", "MANUAL", "MARKUP_CHANGE"]),
  change_reason: z.string().max(255).optional().or(z.literal("")),
});

type CostValues = z.infer<typeof costSchema>;

export default function Costs() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const costs = useApiQuery<CostList>(
    () =>
      api
        .get<CostList>("/costs", {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            search: search || undefined,
            source: source || undefined,
          },
        })
        .then((r) => r.data),
    [search, source, page],
  );

  const products = useApiQuery<ProductList>(() =>
    api.get<ProductList>("/products", { params: { limit: 200 } }).then((r) => r.data),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CostValues>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      sku: "",
      effective_date: "2026-01-31",
      cost_amount: 1000,
      source: "MANUAL",
      change_reason: "",
    },
  });

  const currentMap = costs.data?.current_cost_by_sku ?? {};
  const currentValues = useMemo(() => Object.values(currentMap), [currentMap]);
  const averageCost = currentValues.length
    ? currentValues.reduce((sum, value) => sum + value, 0) / currentValues.length
    : 0;
  const maxCost = currentValues.length ? Math.max(...currentValues) : 0;
  const minCost = currentValues.length ? Math.min(...currentValues) : 0;

  const openModal = () => {
    setFormError(null);
    reset({
      sku: products.data?.items[0]?.sku ?? "",
      effective_date: "2026-01-31",
      cost_amount: 1000,
      source: "MANUAL",
      change_reason: "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: CostValues) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/costs", {
        ...values,
        change_reason: values.change_reason || null,
      });
      toast.success("Cost recorded", `${values.sku} cost basis updated.`);
      setModalOpen(false);
      costs.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Could not record cost", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingBag}
        title="Costs"
        subtitle="Effective-dated cost history. Cost changes flow into protected price floors, ceilings and margin calculations immediately."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => costs.reload()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {canWrite(user?.role) && (
              <button type="button" className="btn-primary" onClick={openModal}>
                <Plus className="h-4 w-4" /> Record cost
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cost records" value={num(costs.data?.total ?? 0)} sub="All effective-dated rows" icon={Layers} tone="brand" />
        <StatCard label="SKUs with cost" value={num(Object.keys(currentMap).length)} sub="Latest effective cost" icon={ShoppingBag} tone="slate" />
        <StatCard label="Average current cost" value={money(averageCost)} sub="Across current SKUs" icon={IndianRupee} tone="emerald" />
        <StatCard label="Cost spread" value={`${money(minCost)} – ${money(maxCost)}`} sub="Min to max current cost" icon={TrendingDown} tone="amber" />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by SKU…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setPage(1);
                  setSearch(searchInput);
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <select className="input" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
              <option value="">All sources</option>
              <option value="BASELINE">Baseline</option>
              <option value="MANUAL">Manual</option>
              <option value="MARKUP_CHANGE">Markup change</option>
            </select>
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => {
                setPage(1);
                setSearch(searchInput);
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {costs.loading ? (
          <LoadingState />
        ) : costs.error ? (
          <ErrorState message={costs.error} onRetry={costs.reload} />
        ) : (costs.data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="No cost records found"
            message="Adjust the filters or record a new effective-dated cost."
            icon={ShoppingBag}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Cost ID</th>
                    <th className="th">SKU</th>
                    <th className="th">Effective date</th>
                    <th className="th text-right">Cost amount</th>
                    <th className="th text-right">Protected floor</th>
                    <th className="th text-right">Ceiling</th>
                    <th className="th">Source</th>
                    <th className="th">Change reason</th>
                    <th className="th">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(costs.data?.items ?? []).map((record) => {
                    const isCurrent =
                      currentMap[record.sku] !== undefined &&
                      Math.abs(currentMap[record.sku] - record.cost_amount) < 0.005;
                    return (
                      <tr key={record.cost_id} className="hover:bg-slate-50/70">
                        <td className="td font-mono text-[11px] text-slate-500">{record.cost_id}</td>
                        <td className="td font-mono text-xs">{record.sku}</td>
                        <td className="td">{dateLabel(record.effective_date)}</td>
                        <td className="td text-right font-semibold">{money(record.cost_amount)}</td>
                        <td className="td text-right text-slate-500">
                          {money(record.cost_amount / (1 - 0.2))}
                        </td>
                        <td className="td text-right text-slate-500">
                          {money(record.cost_amount / (1 - 0.6))}
                        </td>
                        <td className="td">
                          <Badge className="badge-slate">{record.source}</Badge>
                        </td>
                        <td className="td max-w-[220px] truncate text-xs text-slate-500">
                          {record.change_reason ?? "—"}
                        </td>
                        <td className="td">
                          {isCurrent ? (
                            <Badge className="badge-green">Current</Badge>
                          ) : (
                            <Badge className="badge-slate">Historical</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={costs.data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Calculator className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">How cost drives the guardrails</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              The pricing engine derives the protected floor as{" "}
              <span className="font-mono text-slate-700">cost ÷ (1 − 20%)</span> and the ceiling as{" "}
              <span className="font-mono text-slate-700">cost ÷ (1 − 60%)</span>. Any candidate price
              below the floor, or final margin below{" "}
              <span className="font-mono text-slate-700">20%</span>, is blocked and recorded as an
              exception. Margin is always measured on the final discounted price.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <p className="stat-label">Example on {money(1000)} cost</p>
            <p className="mt-1 font-semibold text-slate-900">
              Floor {money(1000 / 0.8)} · Ceiling {money(1000 / 0.4)}
            </p>
            <p className="text-[11px] text-slate-500">
              Margin at floor: {pct(((1000 / 0.8 - 1000) / (1000 / 0.8)) * 100, 2)}
            </p>
          </div>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title="Record cost"
        description="Costs are effective-dated; the latest date on or before the analysis date is used."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="cost-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} Save cost record
            </button>
          </>
        }
      >
        <form id="cost-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <Field label="SKU" error={errors.sku?.message} htmlFor="cost-sku">
            <input
              id="cost-sku"
              className="input font-mono"
              list="cost-sku-list"
              placeholder="SKU-000001"
              {...register("sku")}
            />
            <datalist id="cost-sku-list">
              {(products.data?.items ?? []).map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name}
                </option>
              ))}
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Effective date" error={errors.effective_date?.message} htmlFor="effective_date">
              <input id="effective_date" type="date" className="input" {...register("effective_date")} />
            </Field>
            <Field label="Cost amount (₹)" error={errors.cost_amount?.message} htmlFor="cost_amount">
              <input
                id="cost_amount"
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                {...register("cost_amount", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source" error={errors.source?.message} htmlFor="source">
              <select id="source" className="input" {...register("source")}>
                <option value="MANUAL">Manual</option>
                <option value="BASELINE">Baseline</option>
                <option value="MARKUP_CHANGE">Markup change</option>
              </select>
            </Field>
            <Field
              label="Change reason"
              error={errors.change_reason?.message}
              hint="Recommended for manual adjustments"
              htmlFor="change_reason"
            >
              <input
                id="change_reason"
                className="input"
                placeholder="Supplier price update"
                {...register("change_reason")}
              />
            </Field>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            A cost record cannot duplicate an existing SKU/date pair. The API rejects duplicates with
            a conflict response rather than silently overwriting history.
          </p>
        </form>
      </Modal>
    </div>
  );
}
