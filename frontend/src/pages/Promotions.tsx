import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BadgePercent,
  CalendarRange,
  CheckCircle2,
  CircleSlash,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldQuestion,
  TicketPercent,
  XCircle,
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite, statusBadgeClass } from "../lib/constants";
import { dateLabel, money, num } from "../lib/format";
import type {
  ProductList,
  Promotion,
  PromotionEligibility,
  PromotionList,
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
  StatCard,
  Tabs,
} from "../components/ui";

const promotionSchema = z.object({
  name: z.string().min(2, "Name is required").max(255),
  code: z.string().min(3, "Code is required").max(64),
  discount_type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discount_value: z
    .number({ invalid_type_error: "Enter a numeric discount" })
    .positive("Discount must be greater than zero")
    .max(90, "Discount cannot exceed 90"),
  min_purchase_value: z
    .number({ invalid_type_error: "Enter a numeric value" })
    .min(0, "Cannot be negative"),
  categories: z.string().optional().or(z.literal("")),
  brands: z.string().optional().or(z.literal("")),
  coupon_exclusions: z.string().optional().or(z.literal("")),
  stacking_allowed: z.boolean(),
  max_discount_percent: z
    .number({ invalid_type_error: "Enter a numeric cap" })
    .min(0)
    .max(100, "Cap cannot exceed 100%"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED"]),
});

type PromotionValues = z.infer<typeof promotionSchema>;

const eligibilitySchema = z.object({
  promotion_id: z.string().min(1, "Select a promotion"),
  sku: z.string().min(3, "Select a SKU"),
  quantity: z.number({ invalid_type_error: "Enter a quantity" }).int().min(1),
  customer_total_value: z
    .number({ invalid_type_error: "Enter a basket value" })
    .min(0, "Cannot be negative"),
});

type EligibilityValues = z.infer<typeof eligibilitySchema>;

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function Promotions() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Promotion | null>(null);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<PromotionEligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const promotions = useApiQuery<PromotionList>(
    () =>
      api
        .get<PromotionList>("/promotions", {
          params: {
            status: tab || undefined,
            search: search || undefined,
            skip: (page - 1) * pageSize,
            limit: pageSize,
          },
        })
        .then((r) => r.data),
    [tab, search, page],
  );

  const products = useApiQuery<ProductList>(() =>
    api.get<ProductList>("/products", { params: { limit: 200 } }).then((r) => r.data),
  );

  const linkedProducts = useApiQuery<string[]>(
    () =>
      detail
        ? api.get<string[]>(`/promotions/${detail.promotion_id}/products`).then((r) => r.data)
        : Promise.resolve([]),
    [detail?.promotion_id],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PromotionValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      code: "",
      discount_type: "PERCENTAGE",
      discount_value: 10,
      min_purchase_value: 0,
      categories: "",
      brands: "",
      coupon_exclusions: "",
      stacking_allowed: true,
      max_discount_percent: 30,
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      status: "SCHEDULED",
    },
  });

  const {
    register: registerEligibility,
    handleSubmit: handleEligibilitySubmit,
    reset: resetEligibility,
    formState: { errors: eligibilityErrors, isSubmitting: eligibilitySubmitting },
  } = useForm<EligibilityValues>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: {
      promotion_id: "",
      sku: "",
      quantity: 1,
      customer_total_value: 0,
    },
  });

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset({
      name: "",
      code: "",
      discount_type: "PERCENTAGE",
      discount_value: 10,
      min_purchase_value: 0,
      categories: "",
      brands: "",
      coupon_exclusions: "",
      stacking_allowed: true,
      max_discount_percent: 30,
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      status: "SCHEDULED",
    });
    setModalMode("create");
  };

  const openEdit = (promotion: Promotion) => {
    setEditing(promotion);
    setFormError(null);
    reset({
      name: promotion.name,
      code: promotion.code,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      min_purchase_value: promotion.min_purchase_value,
      categories: promotion.applicable_categories.join(", "),
      brands: promotion.applicable_brands.join(", "),
      coupon_exclusions: promotion.coupon_exclusions.join(", "),
      stacking_allowed: promotion.stacking_allowed,
      max_discount_percent: promotion.max_discount_percent,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      status: promotion.status,
    });
    setModalMode("edit");
  };

  const onSubmit = async (values: PromotionValues) => {
    setSaving(true);
    setFormError(null);
    const payload = {
      name: values.name,
      code: values.code,
      discount_type: values.discount_type,
      discount_value: values.discount_value,
      min_purchase_value: values.min_purchase_value,
      applicable_categories: splitList(values.categories),
      applicable_brands: splitList(values.brands),
      coupon_exclusions: splitList(values.coupon_exclusions),
      stacking_allowed: values.stacking_allowed,
      max_discount_percent: values.max_discount_percent,
      start_date: values.start_date,
      end_date: values.end_date,
      status: values.status,
    };
    try {
      if (modalMode === "create") {
        await api.post("/promotions", payload);
        toast.success("Promotion created", `${values.code} is ready for assignment.`);
      } else if (editing) {
        await api.patch(`/promotions/${editing.promotion_id}`, payload);
        toast.success("Promotion updated", `${values.code} saved.`);
      }
      setModalMode(null);
      promotions.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Could not save promotion", message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (promotion: Promotion, status: string) => {
    setStatusBusy(promotion.promotion_id);
    try {
      await api.post(`/promotions/${promotion.promotion_id}/status`, null, {
        params: { status },
      });
      toast.success("Status updated", `${promotion.code} is now ${status}.`);
      promotions.reload();
      if (detail?.promotion_id === promotion.promotion_id) {
        setDetail({ ...detail, status: status as Promotion["status"] });
      }
    } catch (error) {
      toast.error("Status change failed", getErrorMessage(error));
    } finally {
      setStatusBusy(null);
    }
  };

  const openEligibility = (promotion?: Promotion) => {
    setEligibilityResult(null);
    setEligibilityError(null);
    resetEligibility({
      promotion_id: promotion?.promotion_id ?? promotions.data?.items[0]?.promotion_id ?? "",
      sku: products.data?.items[0]?.sku ?? "",
      quantity: 1,
      customer_total_value: promotion?.min_purchase_value ?? 0,
    });
    setEligibilityOpen(true);
  };

  const onCheckEligibility = async (values: EligibilityValues) => {
    setEligibilityError(null);
    try {
      const response = await api.post<PromotionEligibility>(
        "/promotions/eligibility",
        values,
      );
      setEligibilityResult(response.data);
    } catch (error) {
      setEligibilityError(getErrorMessage(error));
      setEligibilityResult(null);
    }
  };

  const counts = promotions.data?.counts ?? {};
  const list = promotions.data?.items ?? [];
  const tabs = useMemo(
    () => [
      { value: "", label: "All", count: counts.total },
      { value: "ACTIVE", label: "Active", count: counts.ACTIVE },
      { value: "SCHEDULED", label: "Scheduled", count: counts.SCHEDULED },
      { value: "EXPIRED", label: "Expired", count: counts.EXPIRED },
      { value: "INACTIVE", label: "Inactive", count: counts.INACTIVE },
    ],
    [counts],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TicketPercent}
        title="Promotions"
        subtitle="Promotion definitions, lifecycle control and eligibility validation. Stacking rules and discount caps are enforced before a promotion can influence a price."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => openEligibility()}
            >
              <ShieldQuestion className="h-4 w-4" /> Check eligibility
            </button>
            <button type="button" className="btn-secondary" onClick={() => promotions.reload()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {canWrite(user?.role) && (
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> New promotion
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total promotions"
          value={num(counts.total ?? 0)}
          sub="All lifecycle states"
          icon={TicketPercent}
          tone="brand"
        />
        <StatCard
          label="Active"
          value={num(counts.ACTIVE ?? 0)}
          sub="Valid on the analysis date"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Scheduled"
          value={num(counts.SCHEDULED ?? 0)}
          sub="Future campaigns"
          icon={CalendarRange}
          tone="amber"
        />
        <StatCard
          label="Inactive / expired"
          value={num((counts.INACTIVE ?? 0) + (counts.EXPIRED ?? 0))}
          sub="No longer influencing price"
          icon={CircleSlash}
          tone="slate"
        />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            tabs={tabs}
            value={tab}
            onChange={setTab}
          />
          <div className="flex gap-2">
            <div className="relative flex-1 lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search name or code…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setSearch(searchInput);
                    setPage(1);
                  }
                }}
              />
            </div>
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => {
                setSearch(searchInput);
                setPage(1);
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {promotions.loading ? (
          <LoadingState label="Loading promotions…" />
        ) : promotions.error ? (
          <ErrorState message={promotions.error} onRetry={promotions.reload} />
        ) : list.length === 0 ? (
          <EmptyState
            title="No promotions match"
            message="Change the lifecycle filter or create a new promotion."
            icon={BadgePercent}
            action={
              canWrite(user?.role) ? (
                <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" /> New promotion
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
                    <th className="th">Promotion</th>
                    <th className="th">Code</th>
                    <th className="th">Discount</th>
                    <th className="th text-right">Min basket</th>
                    <th className="th text-right">Cap</th>
                    <th className="th">Stacking</th>
                    <th className="th">Window</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((promotion) => (
                    <tr key={promotion.promotion_id} className="hover:bg-slate-50/70">
                      <td className="td">
                        <button
                          type="button"
                          className="max-w-[240px] truncate text-left font-medium text-slate-900 hover:text-brand-700"
                          onClick={() => setDetail(promotion)}
                        >
                          {promotion.name}
                        </button>
                        <p className="font-mono text-[10px] text-slate-400">
                          {promotion.promotion_id}
                        </p>
                      </td>
                      <td className="td font-mono text-xs">{promotion.code}</td>
                      <td className="td font-semibold">
                        {promotion.discount_type === "PERCENTAGE"
                          ? `${promotion.discount_value}%`
                          : money(promotion.discount_value)}
                      </td>
                      <td className="td text-right">{money(promotion.min_purchase_value)}</td>
                      <td className="td text-right">{promotion.max_discount_percent}%</td>
                      <td className="td">
                        {promotion.stacking_allowed ? (
                          <Badge className="badge-blue">Allowed</Badge>
                        ) : (
                          <Badge className="badge-slate">Exclusive</Badge>
                        )}
                      </td>
                      <td className="td text-xs text-slate-500">
                        {dateLabel(promotion.start_date)} → {dateLabel(promotion.end_date)}
                      </td>
                      <td className="td">
                        <Badge className={statusBadgeClass(promotion.status)}>
                          {promotion.status}
                        </Badge>
                      </td>
                      <td className="td text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => setDetail(promotion)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => openEligibility(promotion)}
                          >
                            <ShieldQuestion className="h-3.5 w-3.5" /> Eligibility
                          </button>
                          {canWrite(user?.role) && (
                            <>
                              <button
                                type="button"
                                className="btn-ghost btn-sm"
                                onClick={() => openEdit(promotion)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              {promotion.status === "ACTIVE" ? (
                                <button
                                  type="button"
                                  className="btn-ghost btn-sm text-amber-700"
                                  disabled={statusBusy === promotion.promotion_id}
                                  onClick={() => changeStatus(promotion, "INACTIVE")}
                                >
                                  <Pause className="h-3.5 w-3.5" /> Pause
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-ghost btn-sm text-emerald-700"
                                  disabled={statusBusy === promotion.promotion_id}
                                  onClick={() => changeStatus(promotion, "ACTIVE")}
                                >
                                  <Play className="h-3.5 w-3.5" /> Activate
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={promotions.data?.total ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Drawer
        open={detail !== null}
        title={detail?.name ?? "Promotion"}
        description={detail?.promotion_id}
        onClose={() => setDetail(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDetail(null)}>
              Close
            </button>
            {canWrite(user?.role) && detail && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const current = detail;
                  setDetail(null);
                  openEdit(current);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit promotion
              </button>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <DefinitionList
              items={[
                {
                  label: "Status",
                  value: (
                    <Badge className={statusBadgeClass(detail.status)}>{detail.status}</Badge>
                  ),
                },
                { label: "Code", value: <span className="font-mono">{detail.code}</span> },
                {
                  label: "Discount",
                  value:
                    detail.discount_type === "PERCENTAGE"
                      ? `${detail.discount_value}%`
                      : money(detail.discount_value),
                },
                { label: "Max discount cap", value: `${detail.max_discount_percent}%` },
                { label: "Minimum basket", value: money(detail.min_purchase_value) },
                {
                  label: "Stacking",
                  value: detail.stacking_allowed ? "Allowed with other offers" : "Exclusive",
                },
                { label: "Start", value: dateLabel(detail.start_date) },
                { label: "End", value: dateLabel(detail.end_date) },
              ]}
            />

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Applicability rules
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Categories
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    {detail.applicable_categories.length
                      ? detail.applicable_categories.join(", ")
                      : "All categories"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Brands
                  </p>
                  <p className="mt-1 text-xs text-slate-700">
                    {detail.applicable_brands.length
                      ? detail.applicable_brands.join(", ")
                      : "All brands"}
                  </p>
                </div>
              </div>
              {detail.coupon_exclusions.length > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Cannot be combined with: {detail.coupon_exclusions.join(", ")}
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Linked SKUs
              </h3>
              {linkedProducts.loading ? (
                <LoadingState label="Loading linked products…" />
              ) : linkedProducts.error ? (
                <ErrorState message={linkedProducts.error} onRetry={linkedProducts.reload} />
              ) : (linkedProducts.data?.length ?? 0) === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No SKUs are explicitly linked to this promotion.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(linkedProducts.data ?? []).map((sku) => (
                    <span
                      key={sku}
                      className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600"
                    >
                      {sku}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <p className="rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-relaxed text-brand-900">
              Eligibility checks evaluate link status, minimum basket value, stacking conflicts and
              the discount cap. A promotion that fails these rules is never applied to a recommended
              price.
            </p>
          </div>
        )}
      </Drawer>

      <Modal
        open={modalMode !== null}
        title={modalMode === "create" ? "New promotion" : `Edit ${editing?.code ?? "promotion"}`}
        description="Rules are stored with the promotion and enforced by the pricing engine."
        onClose={() => setModalMode(null)}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModalMode(null)}>
              Cancel
            </button>
            <button
              type="submit"
              form="promotion-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving && <Spinner className="h-4 w-4" />}
              {modalMode === "create" ? "Create promotion" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="promotion-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message} htmlFor="promo-name">
              <input
                id="promo-name"
                className="input"
                placeholder="Winter clearance"
                {...register("name")}
              />
            </Field>
            <Field label="Code" error={errors.code?.message} htmlFor="promo-code">
              <input
                id="promo-code"
                className="input font-mono uppercase"
                placeholder="WINTER10"
                {...register("code")}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Discount type" error={errors.discount_type?.message} htmlFor="discount_type">
              <select id="discount_type" className="input" {...register("discount_type")}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </Field>
            <Field label="Discount value" error={errors.discount_value?.message} htmlFor="discount_value">
              <input
                id="discount_value"
                type="number"
                step="0.01"
                min="0.01"
                max="90"
                className="input"
                {...register("discount_value", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Max discount cap (%)"
              error={errors.max_discount_percent?.message}
              htmlFor="max_discount_percent"
            >
              <input
                id="max_discount_percent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="input"
                {...register("max_discount_percent", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Minimum basket value (₹)"
              error={errors.min_purchase_value?.message}
              htmlFor="min_purchase_value"
            >
              <input
                id="min_purchase_value"
                type="number"
                step="0.01"
                min="0"
                className="input"
                {...register("min_purchase_value", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Status" error={errors.status?.message} htmlFor="promo-status">
              <select id="promo-status" className="input" {...register("status")}>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Start date"
              error={errors.start_date?.message}
              htmlFor="promo-start"
            >
              <input id="promo-start" type="date" className="input" {...register("start_date")} />
            </Field>
            <Field label="End date" error={errors.end_date?.message} htmlFor="promo-end">
              <input id="promo-end" type="date" className="input" {...register("end_date")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Categories"
              hint="Comma separated; blank = all"
              error={errors.categories?.message}
              htmlFor="categories"
            >
              <input
                id="categories"
                className="input"
                placeholder="Electronics, Home"
                {...register("categories")}
              />
            </Field>
            <Field
              label="Brands"
              hint="Comma separated; blank = all"
              error={errors.brands?.message}
              htmlFor="brands"
            >
              <input id="brands" className="input" placeholder="Nova" {...register("brands")} />
            </Field>
            <Field
              label="Coupon exclusions"
              hint="Comma separated codes"
              error={errors.coupon_exclusions?.message}
              htmlFor="coupon_exclusions"
            >
              <input
                id="coupon_exclusions"
                className="input font-mono"
                placeholder="WELCOME5"
                {...register("coupon_exclusions")}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              {...register("stacking_allowed")}
            />
            <span className="text-xs font-semibold text-slate-700">
              Allow stacking with other eligible promotions
            </span>
          </label>
        </form>
      </Modal>

      <Modal
        open={eligibilityOpen}
        title="Promotion eligibility checker"
        description="Validate a SKU and basket against the promotion rules before applying a discount."
        onClose={() => setEligibilityOpen(false)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setEligibilityOpen(false)}>
              Close
            </button>
            <button
              type="submit"
              form="eligibility-form"
              className="btn-primary"
              disabled={eligibilitySubmitting}
            >
              {eligibilitySubmitting && <Spinner className="h-4 w-4" />} Run check
            </button>
          </>
        }
      >
        <form
          id="eligibility-form"
          className="space-y-4"
          onSubmit={handleEligibilitySubmit(onCheckEligibility)}
        >
          {eligibilityError && <InlineError message={eligibilityError} />}
          <Field
            label="Promotion"
            error={eligibilityErrors.promotion_id?.message}
            htmlFor="eligibility-promotion"
          >
            <select
              id="eligibility-promotion"
              className="input"
              {...registerEligibility("promotion_id")}
            >
              <option value="">Select a promotion</option>
              {(promotions.data?.items ?? []).map((promotion) => (
                <option key={promotion.promotion_id} value={promotion.promotion_id}>
                  {promotion.code} — {promotion.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SKU" error={eligibilityErrors.sku?.message} htmlFor="eligibility-sku">
            <input
              id="eligibility-sku"
              className="input font-mono"
              list="eligibility-sku-list"
              placeholder="SKU-000001"
              {...registerEligibility("sku")}
            />
            <datalist id="eligibility-sku-list">
              {(products.data?.items ?? []).map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name}
                </option>
              ))}
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quantity"
              error={eligibilityErrors.quantity?.message}
              htmlFor="eligibility-quantity"
            >
              <input
                id="eligibility-quantity"
                type="number"
                min="1"
                className="input"
                {...registerEligibility("quantity", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Basket value (₹)"
              error={eligibilityErrors.customer_total_value?.message}
              htmlFor="eligibility-basket"
            >
              <input
                id="eligibility-basket"
                type="number"
                step="0.01"
                min="0"
                className="input"
                {...registerEligibility("customer_total_value", { valueAsNumber: true })}
              />
            </Field>
          </div>

          {eligibilityResult && (
            <div
              className={`rounded-xl border p-4 ${
                eligibilityResult.eligible
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {eligibilityResult.eligible ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                <p
                  className={`text-sm font-bold ${
                    eligibilityResult.eligible ? "text-emerald-800" : "text-rose-800"
                  }`}
                >
                  {eligibilityResult.eligible ? "Eligible" : "Not eligible"}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-600">{eligibilityResult.reason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/70 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Discount
                  </p>
                  <p className="font-semibold text-slate-900">
                    {eligibilityResult.discount_percent}% ·{" "}
                    {money(eligibilityResult.discount_amount)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/70 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Final price
                  </p>
                  <p className="font-semibold text-slate-900">{money(eligibilityResult.final_price)}</p>
                </div>
              </div>
              {eligibilityResult.stacking_conflicts.length > 0 && (
                <p className="mt-2 text-xs font-medium text-rose-700">
                  Conflicts: {eligibilityResult.stacking_conflicts.join(", ")}
                </p>
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
