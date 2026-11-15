import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Warehouse,
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite, statusBadgeClass } from "../lib/constants";
import { dateLabel, num } from "../lib/format";
import type { InventoryList, ProductList } from "../types";
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

const snapshotSchema = z.object({
  sku: z.string().min(3, "Select or enter a valid SKU").max(32),
  snapshot_date: z.string().min(1, "Snapshot date is required"),
  quantity_available: z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  reserved_quantity: z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  reorder_point: z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
});

type SnapshotValues = z.infer<typeof snapshotSchema>;

interface LatestRow {
  sku: string;
  snapshot_id: string;
  snapshot_date: string;
  quantity_available: number;
  reserved_quantity: number;
  reorder_point: number;
  stockout_risk: boolean;
}

export default function Inventory() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [stockoutOnly, setStockoutOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inventory = useApiQuery<InventoryList>(() =>
    api
      .get<InventoryList>("/inventory", { params: { limit: 1000 } })
      .then((r) => r.data),
  );
  const products = useApiQuery<ProductList>(() =>
    api.get<ProductList>("/products", { params: { limit: 200 } }).then((r) => r.data),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SnapshotValues>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      sku: "",
      snapshot_date: "2026-01-31",
      quantity_available: 100,
      reserved_quantity: 0,
      reorder_point: 20,
    },
  });

  const allRows: LatestRow[] = useMemo(() => {
    const map = inventory.data?.latest_by_sku ?? {};
    return Object.entries(map)
      .map(([sku, snap]) => ({ sku, ...snap }))
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [inventory.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (stockoutOnly && !row.stockout_risk) return false;
      if (!term) return true;
      return row.sku.toLowerCase().includes(term);
    });
  }, [allRows, search, stockoutOnly]);

  const total = filtered.length;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const availableUnits = allRows.reduce((sum, row) => sum + row.quantity_available, 0);
  const atRisk = allRows.filter((row) => row.stockout_risk).length;
  const overstock = allRows.filter(
    (row) => row.reorder_point > 0 && row.quantity_available > row.reorder_point * 3,
  ).length;

  const openModal = () => {
    setFormError(null);
    reset({
      sku: products.data?.items[0]?.sku ?? "",
      snapshot_date: "2026-01-31",
      quantity_available: 100,
      reserved_quantity: 0,
      reorder_point: 20,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: SnapshotValues) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/inventory", values);
      toast.success("Inventory snapshot recorded", `${values.sku} on ${values.snapshot_date}.`);
      setModalOpen(false);
      inventory.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Could not record snapshot", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Warehouse}
        title="Inventory"
        subtitle="Latest stock position per SKU. Inventory pressure feeds the pricing engine: low stock supports price increases, excess stock supports controlled discounts."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => inventory.reload()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {canWrite(user?.role) && (
              <button type="button" className="btn-primary" onClick={openModal}>
                <Plus className="h-4 w-4" /> New snapshot
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="SKUs tracked"
          value={num(allRows.length)}
          sub="Latest snapshot per SKU"
          icon={Boxes}
          tone="brand"
        />
        <StatCard
          label="Units available"
          value={num(availableUnits)}
          sub="Across latest snapshots"
          icon={PackageCheck}
          tone="emerald"
        />
        <StatCard
          label="At / below reorder"
          value={num(atRisk)}
          sub="Stockout signal active"
          icon={AlertTriangle}
          tone={atRisk > 0 ? "rose" : "emerald"}
        />
        <StatCard
          label="Overstocked"
          value={num(overstock)}
          sub="More than 3× reorder point"
          icon={CalendarClock}
          tone="amber"
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search SKU…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={stockoutOnly}
              onChange={(event) => {
                setStockoutOnly(event.target.checked);
                setPage(1);
              }}
            />
            Stockout risk only
          </label>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {num(total)} SKU{total === 1 ? "" : "s"}
          </span>
        </div>

        {inventory.loading ? (
          <LoadingState label="Loading inventory snapshots…" />
        ) : inventory.error ? (
          <ErrorState message={inventory.error} onRetry={inventory.reload} />
        ) : paged.length === 0 ? (
          <EmptyState
            title="No inventory snapshots match"
            message="Adjust the filters or record a new snapshot."
            icon={Warehouse}
            action={
              canWrite(user?.role) ? (
                <button type="button" className="btn-primary btn-sm" onClick={openModal}>
                  <Plus className="h-3.5 w-3.5" /> New snapshot
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">SKU</th>
                    <th className="th">Snapshot date</th>
                    <th className="th text-right">Available</th>
                    <th className="th text-right">Reserved</th>
                    <th className="th text-right">Reorder point</th>
                    <th className="th text-right">Coverage</th>
                    <th className="th">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paged.map((row) => {
                    const coverage = row.reorder_point
                      ? row.quantity_available / row.reorder_point
                      : null;
                    return (
                      <tr key={row.sku} className="hover:bg-slate-50/70">
                        <td className="td font-mono text-xs text-slate-600">{row.sku}</td>
                        <td className="td text-xs">{dateLabel(row.snapshot_date)}</td>
                        <td className="td text-right font-semibold">{num(row.quantity_available)}</td>
                        <td className="td text-right text-slate-500">{num(row.reserved_quantity)}</td>
                        <td className="td text-right text-slate-500">{num(row.reorder_point)}</td>
                        <td className="td text-right">
                          {coverage === null ? "—" : `${coverage.toFixed(2)}×`}
                        </td>
                        <td className="td">
                          {row.stockout_risk ? (
                            <Badge className="badge-red">Stockout risk</Badge>
                          ) : coverage !== null && coverage > 3 ? (
                            <Badge className="badge-amber">Overstock</Badge>
                          ) : (
                            <Badge className={statusBadgeClass("ACTIVE")}>Healthy</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold text-slate-900">How inventory changes price</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          The engine compares available stock against the reorder point. Stock at or below the
          reorder point adds a scarcity premium and suppresses discounting. Stock above three times
          the reorder point allows a bounded overstock discount. Both signals are recorded inside the
          decision payload so every price can be explained after the fact.
        </p>
      </Card>

      <Modal
        open={modalOpen}
        title="Record inventory snapshot"
        description="One snapshot per SKU and date. The latest date is used by the pricing engine."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="snapshot-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} Save snapshot
            </button>
          </>
        }
      >
        <form id="snapshot-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <Field label="SKU" error={errors.sku?.message} htmlFor="inv-sku">
            <input
              id="inv-sku"
              className="input font-mono"
              list="inventory-sku-list"
              placeholder="SKU-000001"
              {...register("sku")}
            />
            <datalist id="inventory-sku-list">
              {(products.data?.items ?? []).map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Snapshot date" error={errors.snapshot_date?.message} htmlFor="snapshot_date">
            <input id="snapshot_date" type="date" className="input" {...register("snapshot_date")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Available" error={errors.quantity_available?.message} htmlFor="quantity_available">
              <input
                id="quantity_available"
                type="number"
                min="0"
                className="input"
                {...register("quantity_available", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Reserved" error={errors.reserved_quantity?.message} htmlFor="reserved_quantity">
              <input
                id="reserved_quantity"
                type="number"
                min="0"
                className="input"
                {...register("reserved_quantity", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Reorder point" error={errors.reorder_point?.message} htmlFor="reorder_point">
              <input
                id="reorder_point"
                type="number"
                min="0"
                className="input"
                {...register("reorder_point", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            Stockout risk is derived automatically when available quantity is at or below the
            reorder point. Reserved units are excluded from the value calculation on the Analytics
            page.
          </p>
        </form>
      </Modal>
    </div>
  );
}
