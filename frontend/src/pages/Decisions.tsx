import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { api, getErrorMessage } from "../lib/api";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite, statusBadgeClass } from "../lib/constants";
import { dateTimeLabel, money, num, pct } from "../lib/format";
import type { Decision, DecisionList } from "../types";
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
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

const decisionCreateSchema = z.object({
  sku: z.string().min(3, "SKU is required").max(32),
  recommended_price: z.number().positive("Price must be positive"),
  applied_discount: z.number().int().min(0).max(90),
  demand_level: z.enum(["HIGH", "MEDIUM", "LOW", "STABLE"]),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  status: z.enum(["APPROVED", "BLOCKED", "PENDING", "FLAGGED"]),
});

type DecisionCreateValues = z.infer<typeof decisionCreateSchema>;

export default function Decisions() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Decision | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const decisions = useApiQuery<DecisionList>(
    () =>
      api
        .get<DecisionList>("/decisions", {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            search: search || undefined,
            status: undefined,
          },
        })
        .then((r) => r.data),
    [search, page],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DecisionCreateValues>({
    resolver: zodResolver(decisionCreateSchema),
    defaultValues: {
      sku: "",
      recommended_price: 1000,
      applied_discount: 0,
      demand_level: "STABLE",
      reason: "",
      status: "APPROVED",
    },
  });

  const openCreate = () => {
    setFormError(null);
    reset({
      sku: "",
      recommended_price: 1000,
      applied_discount: 0,
      demand_level: "STABLE",
      reason: "",
      status: "APPROVED",
    });
    setModalMode("create");
  };

  const openEdit = (decision: Decision) => {
    setEditing(decision);
    setFormError(null);
    reset({
      sku: decision.sku,
      recommended_price: decision.recommended_price,
      applied_discount: decision.applied_discount,
      demand_level: decision.demand_level,
      reason: decision.reason,
      status: decision.status,
    });
    setModalMode("edit");
  };

  const onSubmit = async (values: DecisionCreateValues) => {
    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === "create") {
        await api.post("/pricing/decisions", {
          sku: values.sku,
          recommended_price: values.recommended_price,
          applied_discount: values.applied_discount,
          demand_level: values.demand_level,
          reason: values.reason,
          status: values.status,
        });
        toast.success("Decision saved", `${values.sku} decision recorded.`);
      } else if (editing) {
        await api.patch(`/decisions/${editing.decision_id}`, {
          ...values,
          reason: values.reason,
        });
        toast.success("Decision updated", `${editing.decision_id} saved.`);
      }
      setModalMode(null);
      decisions.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const list = decisions.data?.items ?? [];
  const total = decisions.data?.total ?? 0;

  // Main return fragment
  const mainContent = (
    <>
      <PageHeader
        icon={ClipboardCheck}
        title="Decision Center"
        subtitle="All pricing decisions with full explainability and traceability. Approved decisions update market prices; blocked decisions remain proposals with recorded exceptions."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            {canWrite(user?.role) && (
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Calculator className="h-4 w-4" /> Add decision
              </button>
            )}
          </>
        }
      />

      {decisions.loading ? (
        <LoadingState label="Loading decisions…" />
      ) : decisions.error ? (
        <ErrorState message={decisions.error} onRetry={decisions.reload} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No decisions recorded"
          message="Run the simulator and save a decision to build history."
          action={
            canWrite(user?.role) ? (
              <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
                <Calculator className="h-3.5 w-3.5" /> Add decision
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
                  <th className="th">Decision</th>
                  <th className="th">SKU</th>
                  <th className="th text-right">Previous</th>
                  <th className="th text-right">Recommended</th>
                  <th className="th text-right">Discount</th>
                  <th className="th">Margin</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((decision: Decision) => (
                  <tr key={decision.decision_id} className="hover:bg-slate-50/70">
                    <td className="td font-mono text-xs text-slate-500">
                      {decision.decision_id}
                    </td>
                    <td className="td font-mono text-xs">{decision.sku}</td>
                    <td className="td text-right">{money(decision.previous_price)}</td>
                    <td className="td text-right font-semibold">
                      {money(decision.recommended_price)}
                    </td>
                    <td className="td text-right">
                      {pct(decision.applied_discount, 2)}
                    </td>
                    <td className="td text-right">
                      {pct(decision.expected_margin, 2)}
                    </td>
                    <td className="td">
                      <Badge className={statusBadgeClass(decision.status)}>
                        {decision.status}
                      </Badge>
                    </td>
                    <td className="td text-xs text-slate-500">
                      {dateTimeLabel(decision.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={modalMode !== null}
        title={modalMode === "create" ? "Add pricing decision" : `Edit ${editing?.decision_id}`}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <Field label="SKU" error={errors.sku?.message} htmlFor="dec-sku">
            <input
              id="dec-sku"
              className="input font-mono"
              placeholder="SKU-000001"
              {...register("sku")}
            />
          </Field>
          <Field label="Recommended price (₹)" error={errors.recommended_price?.message} htmlFor="dec-price">
            <input
              id="dec-price"
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              {...register("recommended_price", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Applied discount (%)" error={errors.applied_discount?.message} htmlFor="dec-discount">
            <input
              id="dec-discount"
              type="number"
              min="0"
              max="90"
              step="0.01"
              className="input"
              {...register("applied_discount", { valueAsNumber: true })}
            />
          </Field>
          <Field label="Demand level" error={errors.demand_level?.message} htmlFor="demand_level">
            <select
              id="demand_level"
              className="input"
              {...register("demand_level")}
            >
              <option value="STABLE">Stable</option>
              <option value="HIGH">High</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </Field>
          <Field label="Reason" error={errors.reason?.message} htmlFor="dec-reason">
            <textarea
              id="dec-reason"
              rows={3}
              className="input"
              placeholder="Explain the commercial rationale…"
              {...register("reason")}
            />
          </Field>
          <Field label="Status" error={errors.status?.message} htmlFor="dec-status">
            <select
              id="dec-status"
              className="input"
              {...register("status")}
            >
              <option value="APPROVED">Approved</option>
              <option value="BLOCKED">Blocked</option>
              <option value="PENDING">Pending</option>
              <option value="FLAGGED">Flagged</option>
            </select>
          </Field>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModalMode(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving && <Spinner className="h-4 w-4" />}
              {modalMode === "create" ? "Create decision" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );

  return mainContent;
}