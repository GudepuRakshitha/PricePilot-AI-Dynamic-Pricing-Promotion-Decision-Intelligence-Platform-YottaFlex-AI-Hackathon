import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  FlaskConical,
  Info,
  RefreshCw,
  Save,
  ShieldCheck,
  XCircle,
  XOctagon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useToast } from "../context/ToastContext";
import { statusBadgeClass } from "../lib/constants";
import { money, num, pct } from "../lib/format";
import type {
  ProductList,
  PromotionList,
  Scenario,
  SimulationResponse,
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
  Spinner,
  StatCard,
} from "../components/ui";

const simulationSchema = z.object({
  sku: z.string().min(3, "Select a SKU"),
  demand_level: z.enum(["HIGH", "MEDIUM", "LOW", "STABLE"]),
  available_stock: z
    .number({ invalid_type_error: "Enter available stock" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  competitor_price: z.string().optional().or(z.literal("")),
  promotion_id: z.string().optional().or(z.literal("")),
  min_margin_pct: z
    .number({ invalid_type_error: "Enter a minimum margin" })
    .min(0, "Cannot be negative")
    .max(90, "Cannot exceed 90%"),
});

type SimulationValues = z.infer<typeof simulationSchema>;

const saveSchema = z.object({
  reason: z
    .string()
    .min(10, "Give a reason of at least 10 characters")
    .max(1024, "Keep the reason under 1024 characters"),
});

type SaveValues = z.infer<typeof saveSchema>;

function scenarioTone(status: string) {
  switch (status) {
    case "APPROVED":
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50/60",
        text: "text-emerald-800",
        icon: CheckCircle2,
      };
    case "BLOCKED":
      return {
        border: "border-rose-200",
        bg: "bg-rose-50/60",
        text: "text-rose-800",
        icon: XOctagon,
      };
    case "FLAGGED":
      return {
        border: "border-amber-200",
        bg: "bg-amber-50/60",
        text: "text-amber-800",
        icon: AlertTriangle,
      };
    default:
      return {
        border: "border-slate-200",
        bg: "bg-slate-50/60",
        text: "text-slate-800",
        icon: Info,
      };
  }
}

export default function Simulator() {
  const toast = useToast();
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saveTarget, setSaveTarget] = useState<Scenario | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedDecision, setSavedDecision] = useState<string | null>(null);

  const products = useApiQuery<ProductList>(() =>
    api.get<ProductList>("/products", { params: { limit: 200 } }).then((r) => r.data),
  );
  const promotions = useApiQuery<PromotionList>(() =>
    api
      .get<PromotionList>("/promotions", { params: { limit: 100, status: "ACTIVE" } })
      .then((r) => r.data),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SimulationValues>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      sku: "",
      demand_level: "HIGH",
      available_stock: 25,
      competitor_price: "",
      promotion_id: "",
      min_margin_pct: 20,
    },
  });

  const {
    register: registerSave,
    handleSubmit: handleSaveSubmit,
    reset: resetSave,
    formState: { errors: saveErrors },
  } = useForm<SaveValues>({
    resolver: zodResolver(saveSchema),
    defaultValues: { reason: "" },
  });

  const productItems = products.data?.items ?? [];
  const activePromotions = promotions.data?.items ?? [];

  const onSubmit = async (values: SimulationValues) => {
    setRunning(true);
    setRunError(null);
    setSavedDecision(null);
    try {
      const scenarioOverride: Record<string, unknown> = {
        demand_level: values.demand_level,
        available_stock: values.available_stock,
      };
      if (values.competitor_price && values.competitor_price.trim() !== "") {
        scenarioOverride.competitor_price = Number(values.competitor_price);
      }
      const response = await api.post<SimulationResponse>("/pricing/simulate", {
        sku: values.sku,
        min_margin_pct: values.min_margin_pct,
        promotion_id: values.promotion_id || null,
        scenarios: [scenarioOverride],
      });
      setResult(response.data);
      toast.success(
        "Simulation complete",
        `${response.data.scenarios.length} scenarios evaluated for ${response.data.sku}.`,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setRunError(message);
      setResult(null);
      toast.error("Simulation failed", message);
    } finally {
      setRunning(false);
    }
  };

  const openSave = (scenario: Scenario) => {
    setSaveTarget(scenario);
    setSaveError(null);
    setSavedDecision(null);
    resetSave({
      reason: `${scenario.name} approved after constraint review for ${result?.sku ?? "SKU"}.`,
    });
  };

  const onSave = async (values: SaveValues) => {
    if (!saveTarget || !result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await api.post<{ decision_id: string }>("/pricing/decisions", {
        sku: result.sku,
        recommended_price: saveTarget.candidate_price,
        applied_discount: saveTarget.discount_percent,
        demand_level: saveTarget.demand_level,
        reason: values.reason,
        status: "APPROVED",
      });
      setSavedDecision(response.data.decision_id);
      setSaveTarget(null);
      toast.success(
        "Decision saved",
        `${response.data.decision_id} recorded with full traceability.`,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setSaveError(message);
      toast.error("Could not save decision", message);
    } finally {
      setSaving(false);
    }
  };

  const scenarioRows = result?.scenarios ?? [];
  const approved = useMemo(
    () => scenarioRows.filter((scenario) => scenario.status === "APPROVED").length,
    [scenarioRows],
  );
  const blocked = useMemo(
    () => scenarioRows.filter((scenario) => scenario.status === "BLOCKED").length,
    [scenarioRows],
  );
  const recommended = scenarioRows.find(
    (scenario) => scenario.scenario_id === result?.recommended_scenario_id,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Calculator}
        title="Pricing Simulator"
        subtitle="Deterministic what-if pricing. Every scenario is evaluated against the price floor, margin rules, inventory, demand and promotion constraints before a price can be approved."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setResult(null);
              setRunError(null);
              setSavedDecision(null);
            }}
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span className="font-semibold">Simulated output</span>
        <span className="text-amber-800/80">
          Scenario prices are computed in memory and are not written to price history. Saving a
          decision is a separate, audited action.
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader
            title="Scenario inputs"
            subtitle="Baseline uses current stored price, cost and inventory"
          />
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {runError && <InlineError message={runError} />}
            <Field label="SKU" error={errors.sku?.message} htmlFor="sim-sku">
              <select
                id="sim-sku"
                className="input font-mono"
                {...register("sku", {
                  onChange: (event) => prefillFromProduct(event.target.value),
                })}
              >
                <option value="">Select a SKU</option>
                {productItems.map((product) => (
                  <option key={product.sku} value={product.sku}>
                    {product.sku} — {product.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Demand level" error={errors.demand_level?.message} htmlFor="demand_level">
                <select id="demand_level" className="input" {...register("demand_level")}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="STABLE">Stable</option>
                  <option value="LOW">Low</option>
                </select>
              </Field>
              <Field
                label="Available stock"
                error={errors.available_stock?.message}
                htmlFor="available_stock"
              >
                <input
                  id="available_stock"
                  type="number"
                  min="0"
                  className="input"
                  {...register("available_stock", { valueAsNumber: true })}
                />
              </Field>
            </div>

            <Field
              label="Competitor price (₹)"
              hint="Leave blank to use the latest stored observation"
              error={errors.competitor_price?.message}
              htmlFor="competitor_price"
            >
              <input
                id="competitor_price"
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                placeholder="Optional override"
                {...register("competitor_price")}
              />
            </Field>

            <Field
              label="Promotion"
              hint="Only active promotions are listed"
              error={errors.promotion_id?.message}
              htmlFor="promotion_id"
            >
              <select id="promotion_id" className="input" {...register("promotion_id")}>
                <option value="">No promotion</option>
                {activePromotions.map((promotion) => (
                  <option key={promotion.promotion_id} value={promotion.promotion_id}>
                    {promotion.code} —{" "}
                    {promotion.discount_type === "PERCENTAGE"
                      ? `${promotion.discount_value}%`
                      : money(promotion.discount_value)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Minimum margin (%)"
              hint="Default policy floor is 20%"
              error={errors.min_margin_pct?.message}
              htmlFor="min_margin_pct"
            >
              <input
                id="min_margin_pct"
                type="number"
                step="0.1"
                min="0"
                max="90"
                className="input"
                {...register("min_margin_pct", { valueAsNumber: true })}
              />
            </Field>

            <button type="submit" className="btn-primary w-full" disabled={running}>
              {running ? <Spinner className="h-4 w-4" /> : <Calculator className="h-4 w-4" />}
              {running ? "Evaluating constraints…" : "Run simulation"}
            </button>
            <p className="text-[11px] leading-relaxed text-slate-400">
              The engine returns a baseline scenario using current inputs plus your override
              scenario. Candidate price, discount, final price, margin and each constraint result
              are all visible.
            </p>
          </form>
        </Card>

        <div className="space-y-4">
          {running ? (
            <Card>
              <LoadingState label="Running deterministic pricing engine…" />
            </Card>
          ) : !result ? (
            <Card>
              <EmptyState
                icon={Calculator}
                title="No simulation yet"
                message="Choose a SKU and demand scenario, then run the engine to see the baseline and override comparison."
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Base price"
                  value={money(result.base_price)}
                  sub="Latest effective price"
                  icon={Info}
                  tone="slate"
                />
                <StatCard
                  label="Cost basis"
                  value={money(result.cost)}
                  sub="Latest effective cost"
                  icon={Calculator}
                  tone="brand"
                />
                <StatCard
                  label="Approved scenarios"
                  value={num(approved)}
                  sub={`${num(blocked)} blocked`}
                  icon={ShieldCheck}
                  tone={blocked > 0 ? "amber" : "emerald"}
                />
                <StatCard
                  label="Recommended"
                  value={recommended ? money(recommended.final_price) : "—"}
                  sub={recommended?.scenario_id.replace("_", " ") ?? "No approvable scenario"}
                  icon={CheckCircle2}
                  tone="emerald"
                />
              </div>

              {savedDecision && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">{savedDecision} saved.</span>
                  <Link
                    to="/decisions"
                    className="ml-auto inline-flex items-center gap-1 font-semibold underline"
                  >
                    Open decision center <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {scenarioRows.map((scenario) => {
                  const tone = scenarioTone(scenario.status);
                  const Icon = tone.icon;
                  const failed = scenario.constraints.filter((item) => !item.passed);
                  const isRecommended =
                    scenario.scenario_id === result.recommended_scenario_id;
                  return (
                    <div
                      key={scenario.scenario_id}
                      className={`rounded-xl border ${tone.border} ${tone.bg} p-4`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${tone.text}`} />
                            <h3 className="text-sm font-bold text-slate-900">{scenario.name}</h3>
                            {isRecommended && (
                              <Badge className="badge-blue">Recommended</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Demand {scenario.demand_level} · Stock {num(scenario.available_stock)}
                            {scenario.promotion_id ? ` · ${scenario.promotion_id}` : ""}
                          </p>
                        </div>
                        <Badge className={statusBadgeClass(scenario.status)}>
                          {scenario.status}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Candidate price
                          </p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {money(scenario.candidate_price)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Final price
                          </p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {money(scenario.final_price)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Discount
                          </p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {pct(scenario.discount_percent, 2)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Expected margin
                          </p>
                          <p
                            className={`mt-0.5 font-semibold ${
                              scenario.expected_margin >= 20
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }`}
                          >
                            {pct(scenario.expected_margin, 2)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Est. revenue
                          </p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {money(scenario.estimated_revenue)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Est. gross profit
                          </p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {money(scenario.estimated_gross_profit)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                        {scenario.explanation}
                      </p>

                      <div className="mt-3 space-y-1.5">
                        {scenario.constraints.map((constraint) => (
                          <div
                            key={constraint.rule_code}
                            className="flex items-start gap-2 text-[11px]"
                          >
                            {constraint.passed ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            ) : (
                              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                            )}
                            <div>
                              <span className="font-semibold text-slate-700">
                                {constraint.rule_code.replace(/_/g, " ")}
                              </span>
                              <span className="text-slate-500"> — {constraint.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {failed.length > 0 && (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                          {failed.length} constraint{failed.length === 1 ? "" : "s"} failed — price
                          blocked
                        </p>
                      )}

                      <button
                        type="button"
                        className="btn-primary btn-sm mt-3 w-full"
                        onClick={() => openSave(scenario)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {scenario.status === "APPROVED"
                          ? "Save as pricing decision"
                          : "Save blocked proposal"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Explainability contract</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Every scenario exposes the candidate price, applied discount, final price, margin
              measured on the discounted price, and each constraint with its rule code and detail.
              Only approved decisions write an effective price record; blocked proposals are stored
              with their reason and an exception for review.
            </p>
          </div>
        </div>
      </Card>

      <Modal
        open={saveTarget !== null}
        title="Save pricing decision"
        description={
          saveTarget
            ? `${saveTarget.name} · final ${money(saveTarget.final_price)} · ${pct(
                saveTarget.expected_margin,
                2,
              )} margin`
            : undefined
        }
        onClose={() => setSaveTarget(null)}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setSaveTarget(null)}>
              Cancel
            </button>
            <button type="submit" form="save-decision-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} Save decision
            </button>
          </>
        }
      >
        <form id="save-decision-form" className="space-y-4" onSubmit={handleSaveSubmit(onSave)}>
          {saveError && <InlineError message={saveError} />}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p>
              SKU <span className="font-mono font-semibold">{result?.sku}</span>
            </p>
            <p className="mt-1">
              Candidate {money(saveTarget?.candidate_price)} · discount{" "}
              {pct(saveTarget?.discount_percent, 2)} · final {money(saveTarget?.final_price)}
            </p>
            <p className="mt-1">
              The backend recomputes the final price and margin. Floor breaches are blocked and
              recorded as exceptions.
            </p>
          </div>
          <Field
            label="Decision reason"
            error={saveErrors.reason?.message}
            hint="Stored with the decision and price history record"
            htmlFor="decision-reason"
          >
            <textarea
              id="decision-reason"
              rows={4}
              className="input"
              placeholder="Explain the commercial rationale for this price…"
              {...registerSave("reason")}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
