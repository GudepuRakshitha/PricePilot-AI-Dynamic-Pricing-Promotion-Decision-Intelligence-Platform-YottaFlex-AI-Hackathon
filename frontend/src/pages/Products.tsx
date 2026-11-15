import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Boxes,
  Eye,
  Filter,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite, statusBadgeClass } from "../lib/constants";
import { dateLabel, money, num, pct, titleCase } from "../lib/format";
import type {
  Product,
  ProductFacets,
  ProductList,
  ProductOverview,
} from "../types";
import {
  Badge,
  Card,
  DefinitionList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
} from "../components/ui";

const productSchema = z.object({
  sku: z
    .string()
    .min(3, "SKU must be at least 3 characters")
    .max(32, "SKU must be 32 characters or fewer")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only"),
  name: z.string().min(2, "Name is required").max(255),
  category: z.string().min(2, "Category is required").max(128),
  brand: z.string().min(2, "Brand is required").max(128),
  lifecycle_state: z.enum(["ACTIVE", "RETIRED", "PLANNED"]),
  description: z.string().max(1024).optional().or(z.literal("")),
});

type ProductValues = z.infer<typeof productSchema>;

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Products() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [lifecycle, setLifecycle] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const products = useApiQuery<ProductList>(
    () =>
      api
        .get<ProductList>("/products", {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            search: search || undefined,
            category: category || undefined,
            brand: brand || undefined,
            lifecycle_state: lifecycle || undefined,
          },
        })
        .then((r) => r.data),
    [search, category, brand, lifecycle, page],
  );

  const facets = useApiQuery<ProductFacets>(() =>
    api.get<ProductFacets>("/products/facets").then((r) => r.data),
  );

  const overview = useApiQuery<ProductOverview | null>(
    () =>
      selectedSku
        ? api.get<ProductOverview>(`/products/${selectedSku}/overview`).then((r) => r.data)
        : Promise.resolve(null),
    [selectedSku],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      name: "",
      category: "",
      brand: "",
      lifecycle_state: "ACTIVE",
      description: "",
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search, category, brand, lifecycle]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset({
      sku: "",
      name: "",
      category: facets.data?.categories[0] ?? "Electronics",
      brand: facets.data?.brands[0] ?? "Nova",
      lifecycle_state: "ACTIVE",
      description: "",
    });
    setModalMode("create");
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormError(null);
    reset({
      sku: product.sku,
      name: product.name,
      category: product.category,
      brand: product.brand,
      lifecycle_state: product.lifecycle_state,
      description: product.description ?? "",
    });
    setModalMode("edit");
  };

  const onSubmit = async (values: ProductValues) => {
    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === "create") {
        await api.post("/products", { ...values, description: values.description || null });
        toast.success("Product created", `${values.sku} is now part of the catalog.`);
      } else if (editing) {
        const { sku: _sku, ...payload } = values;
        await api.patch(`/products/${editing.sku}`, {
          ...payload,
          description: payload.description || null,
        });
        toast.success("Product updated", `${editing.sku} saved.`);
      }
      setModalMode(null);
      products.reload();
      facets.reload();
      if (selectedSku) overview.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const list = products.data?.items ?? [];
  const total = products.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle="Catalog master data with lifecycle state. Each SKU links to costs, inventory, competitor observations, promotions and pricing decisions."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => products.reload()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {canWrite(user?.role) && (
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add product
              </button>
            )}
          </>
        }
      />

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search SKU, name, category or brand…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {(facets.data?.categories ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select className="input" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All brands</option>
              {(facets.data?.brands ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select className="input" value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}>
              <option value="">All states</option>
              <option value="ACTIVE">Active</option>
              <option value="PLANNED">Planned</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>

        {products.loading ? (
          <LoadingState />
        ) : products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : list.length === 0 ? (
          <EmptyState
            title="No products match your filters"
            message="Clear the filters or add a product to the catalog."
            icon={Filter}
            action={
              canWrite(user?.role) ? (
                <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" /> Add product
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
                    <th className="th">Product</th>
                    <th className="th">Category</th>
                    <th className="th">Brand</th>
                    <th className="th">Lifecycle</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((product) => (
                    <tr key={product.sku} className="hover:bg-slate-50/70">
                      <td className="td font-mono text-xs text-slate-500">{product.sku}</td>
                      <td className="td">
                        <p className="max-w-[260px] truncate font-medium text-slate-900">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="max-w-[260px] truncate text-[11px] text-slate-400">
                            {product.description}
                          </p>
                        )}
                      </td>
                      <td className="td">{product.category}</td>
                      <td className="td">{product.brand}</td>
                      <td className="td">
                        <Badge className={statusBadgeClass(product.lifecycle_state)}>
                          {product.lifecycle_state}
                        </Badge>
                      </td>
                      <td className="td text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => setSelectedSku(product.sku)}
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          {canWrite(user?.role) && (
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              onClick={() => openEdit(product)}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalMode !== null}
        title={modalMode === "create" ? "Add product" : `Edit ${editing?.sku ?? "product"}`}
        description="Catalog records feed every downstream pricing signal."
        onClose={() => setModalMode(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalMode(null)}>
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? <Spinner className="h-4 w-4" /> : null}
              {modalMode === "create" ? "Create product" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="product-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" error={errors.sku?.message} htmlFor="sku">
              <input
                id="sku"
                className="input font-mono"
                placeholder="SKU-000123"
                disabled={modalMode === "edit"}
                {...register("sku")}
              />
            </Field>
            <Field label="Lifecycle state" error={errors.lifecycle_state?.message} htmlFor="lifecycle">
              <select id="lifecycle" className="input" {...register("lifecycle_state")}>
                <option value="ACTIVE">Active</option>
                <option value="PLANNED">Planned</option>
                <option value="RETIRED">Retired</option>
              </select>
            </Field>
          </div>
          <Field label="Product name" error={errors.name?.message} htmlFor="name">
            <input id="name" className="input" placeholder="Nova Electronics 042" {...register("name")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={errors.category?.message} htmlFor="category">
              <input id="category" className="input" list="category-list" {...register("category")} />
              <datalist id="category-list">
                {(facets.data?.categories ?? []).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
            <Field label="Brand" error={errors.brand?.message} htmlFor="brand">
              <input id="brand" className="input" list="brand-list" {...register("brand")} />
              <datalist id="brand-list">
                {(facets.data?.brands ?? []).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message} htmlFor="description">
            <textarea
              id="description"
              rows={3}
              className="input"
              placeholder="Optional commercial description"
              {...register("description")}
            />
          </Field>
        </form>
      </Modal>

      <Drawer
        open={selectedSku !== null}
        title={overview.data?.product.name ?? selectedSku ?? "Product"}
        description={selectedSku ?? undefined}
        onClose={() => setSelectedSku(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setSelectedSku(null)}>
              Close
            </button>
            {canWrite(user?.role) && overview.data && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const product = overview.data?.product;
                  setSelectedSku(null);
                  if (product) openEdit(product);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit product
              </button>
            )}
          </>
        }
      >
        {overview.loading ? (
          <LoadingState label="Loading cross-domain product view…" />
        ) : overview.error ? (
          <ErrorState message={overview.error} onRetry={overview.reload} />
        ) : overview.data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="stat-label">Current cost</p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {money(overview.data.current_cost)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="stat-label">Selling price</p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {money(overview.data.current_price)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="stat-label">Margin</p>
                <p
                  className={`mt-1 text-base font-bold ${
                    (overview.data.margin_pct ?? 0) >= 20 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {pct(overview.data.margin_pct, 2)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="stat-label">Floor / ceiling</p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  {money(overview.data.price_floor)} / {money(overview.data.price_ceiling)}
                </p>
              </div>
            </div>

            <DefinitionList
              items={[
                { label: "Category", value: overview.data.product.category },
                { label: "Brand", value: overview.data.product.brand },
                {
                  label: "Lifecycle",
                  value: (
                    <Badge className={statusBadgeClass(overview.data.product.lifecycle_state)}>
                      {overview.data.product.lifecycle_state}
                    </Badge>
                  ),
                },
                { label: "Created", value: dateLabel(overview.data.product.created_at) },
              ]}
            />

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Boxes className="h-3.5 w-3.5" /> Inventory &amp; market
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700">Latest inventory snapshot</p>
                  {overview.data.inventory ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>
                        Available:{" "}
                        <span className="font-semibold text-slate-900">
                          {num(overview.data.inventory.quantity_available)}
                        </span>
                      </p>
                      <p>Reserved: {num(overview.data.inventory.reserved_quantity)}</p>
                      <p>Reorder point: {num(overview.data.inventory.reorder_point)}</p>
                      <p>
                        Stockout risk:{" "}
                        <Badge
                          className={
                            overview.data.inventory.stockout_risk ? "badge-red" : "badge-green"
                          }
                        >
                          {overview.data.inventory.stockout_risk ? "At risk" : "Healthy"}
                        </Badge>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Snapshot {dateLabel(overview.data.inventory.snapshot_date)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No snapshot recorded.</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700">Latest competitor signal</p>
                  {overview.data.latest_competitor ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>
                        Competitor:{" "}
                        <span className="font-semibold text-slate-900">
                          {overview.data.latest_competitor.competitor}
                        </span>
                      </p>
                      <p>Observed price: {money(overview.data.latest_competitor.observed_price)}</p>
                      <p className={overview.data.latest_competitor.is_stale ? "text-amber-600" : ""}>
                        {overview.data.latest_competitor.is_stale
                          ? `Stale — ${overview.data.latest_competitor.stale_reason ?? "outside freshness window"}`
                          : "Fresh observation"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Observed {dateLabel(overview.data.latest_competitor.observed_at)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No observation recorded.</p>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Tag className="h-3.5 w-3.5" /> Promotions
              </h3>
              {overview.data.active_promotions.length > 0 ? (
                <ul className="space-y-2">
                  {overview.data.active_promotions.map((promo) => (
                    <li
                      key={promo.promotion_id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{promo.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{promo.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          {promo.discount_type === "PERCENTAGE"
                            ? `${promo.discount_value}%`
                            : money(promo.discount_value)}
                        </span>
                        <Badge className={statusBadgeClass(promo.status)}>{promo.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No promotions linked to this SKU.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent price history
              </h3>
              {overview.data.recent_price_history.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Effective</th>
                        <th className="th text-right">Price</th>
                        <th className="th">Source</th>
                        <th className="th">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.data.recent_price_history.map((row) => (
                        <tr key={row.price_id}>
                          <td className="td text-xs">{dateLabel(row.effective_date)}</td>
                          <td className="td text-right text-xs font-semibold">
                            {money(row.selling_price)}
                          </td>
                          <td className="td text-xs">{row.source}</td>
                          <td className="td text-xs text-slate-500">
                            {row.change_reason ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No price history recorded.</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent decisions
              </h3>
              {overview.data.recent_decisions.length > 0 ? (
                <ul className="space-y-1.5">
                  {overview.data.recent_decisions.map((row) => (
                    <li
                      key={row.decision_id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-[10px] text-slate-500">{row.decision_id}</span>
                      <span className="font-semibold text-slate-900">{money(row.recommended_price)}</span>
                      <span className="text-slate-500">{pct(row.expected_margin, 2)}</span>
                      <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No decisions recorded for this SKU.</p>
              )}
            </section>

            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-400">
              Values shown are the latest stored records. Floor and ceiling are computed from the
              current cost using the configured {titleCase("min")} margin policy (20% floor, 60%
              ceiling).
            </p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
