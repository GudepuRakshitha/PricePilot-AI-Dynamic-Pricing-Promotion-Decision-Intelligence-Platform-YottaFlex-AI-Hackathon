import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite, statusBadgeClass } from "../lib/constants";
import { dateLabel, num } from "../lib/format";
import type { ExceptionList } from "../types";
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
} from "../components/ui";

const exceptionCreateSchema = z.object({
  issue_type: z.enum([
    "PRICE_BELOW_FLOOR",
    "PROMOTION_STACK_VIOLATION",
    "STALE_COMPETITOR_OBSERVATION",
    "INCORRECT_MARGIN_CALCULATION",
    "MISSING_PRICE_CHANGE_REASON",
    "OTHER",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  sku: z.string().min(3, "SKU is required").max(32),
  description: z.string().min(10, "Description must be at least 10 characters"),
  expected_behavior: z.string().min(5, "Expected behavior must be at least 5 characters"),
  actual_behavior: z.string().min(5, "Actual behavior must be at least 5 characters"),
  resolution_status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).default("OPEN"),
});

type ExceptionCreateValues = z.infer<typeof exceptionCreateSchema>;

export default function Exceptions() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ExceptionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const exceptions = useApiQuery<ExceptionList>(
    () =>
      api
        .get<ExceptionList>("/exceptions", {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            search: search || undefined,
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
  } = useForm<ExceptionCreateValues>({
    resolver: zodResolver(exceptionCreateSchema),
    defaultValues: {
      issue_type: "PRICE_BELOW_FLOOR",
      severity: "MEDIUM",
      sku: "",
      description: "",
      expected_behavior: "",
      actual_behavior: "",
      resolution_status: "OPEN",
    },
  });

  const openCreate = () => {
    setFormError(null);
    reset({
      issue_type: "PRICE_BELOW_FLOOR",
      severity: "MEDIUM",
      sku: "",
      description: "",
      expected_behavior: "",
      actual_behavior: "",
      resolution_status: "OPEN",
    });
    setModalMode("create");
  };

  const openEdit = (exception: ExceptionRecord) => {
    setEditing(exception);
    setFormError(null);
    reset({
      issue_type: exception.issue_type,
      severity: exception.severity,
      sku: exception.sku,
      description: exception.description,
      expected_behavior: exception.expected_behavior,
      actual_behavior: exception.actual_behavior,
      resolution_status: exception.resolution_status,
    });
    setModalMode("edit");
  };

  const onSubmit = async (values: ExceptionCreateValues) => {
    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === "create") {
        await api.post("/exceptions", {
          issue_type: values.issue_type,
          severity: values.severity,
          sku: values.sku,
          description: values.description,
          expected_behavior: values.expected_behavior,
          actual_behavior: values.actual_behavior,
          resolution_status: values.resolution_status,
        });
        toast.success("Exception recorded", `${values.issue_type} for ${values.sku}.`);
      } else if (editing) {
        await api.patch(`/exceptions/${editing.exception_id}`, {
          issue_type: values.issue_type,
          severity: values.severity,
          sku: values.sku,
          description: values.description,
          expected_behavior: values.expected_behavior,
          actual_behavior: values.actual_behavior,
          resolution_status: values.resolution_status,
        });
        toast.success("Exception updated", `${editing.exception_id} saved.`);
      }
      setModalMode(null);
      exceptions.reload();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const list = exceptions.data?.items ?? [];
  const total = exceptions.data?.total ?? 0;

  // Main return fragment
  const mainContent = (
    <>
      <PageHeader
        icon={AlertTriangle}
        title="Exceptions"
        subtitle="Edge cases and constraint violations requiring analyst attention. All exceptions are linked to pricing decisions for full traceability."
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
                <AlertTriangle className="h-4 w-4" /> New exception
              </button>
            )}
          </>
        }
      />

      {exceptions.loading ? (
        <LoadingState label="Loading exceptions…" />
      ) : exceptions.error ? (
        <ErrorState message={exceptions.error} onRetry={exceptions.reload} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No exceptions detected"
          message="Price decisions are currently within all guardrails."
          icon={ShieldCheck}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Exception</th>
                  <th className="th">SKU</th>
                  <th className="th">Issue</th>
                  <th className="th">Severity</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Decision</th>
                  <th className="th text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((exception) => (
                  <tr key={exception.exception_id} className="hover:bg-slate-50/70">
                    <td className="td font-mono text-[11px] text-slate-500">
                      {exception.exception_id}
                    </td>
                    <td className="td font-mono text-xs">{exception.sku}</td>
                    <td className="td font-medium text-slate-600">
                      {exception.issue_type}
                    </td>
                    <td className="td">
                      <Badge className={statusBadgeClass(exception.severity)}>
                        {exception.severity}
                      </Badge>
                    </td>
                    <td className="td">
                      <Badge className={statusBadgeClass(exception.resolution_status)}>
                        {exception.resolution_status}
                      </Badge>
                    </td>
                    <td className="td font-mono text-xs text-slate-500">
                      {exception.decision_id ?? "—"}
                    </td>
                    <td className="td text-xs text-slate-500">
                      {dateLabel(exception.detected_at)}
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
        title={modalMode === "create" ? "New exception" : `Edit ${editing?.exception_id}`}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {formError && <InlineError message={formError} />}
          <Field label="Issue type" error={errors.issue_type?.message} htmlFor="exc-issue">
            <select
              id="exc-issue"
              className="input"
              {...register("issue_type")}
            >
              <option value="PRICE_BELOW_FLOOR">Price below floor</option>
              <option value="PROMOTION_STACK_VIOLATION">Promotion stack violation</option>
              <option value="STALE_COMPETITOR_OBSERVATION">Stale competitor observation</option>
              <option value="INCORRECT_MARGIN_CALCULATION">Incorrect margin calculation</option>
              <option value="MISSING_PRICE_CHANGE_REASON">Missing price change reason</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Severity" error={errors.severity?.message} htmlFor="exc-severity">
            <select
              id="exc-severity"
              className="input"
              {...register("severity")}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </Field>
          <Field label="SKU" error={errors.sku?.message} htmlFor="exc-sku">
            <input
              id="exc-sku"
              className="input font-mono"
              placeholder="SKU-000001"
              {...register("sku")}
            />
          </Field>
          <Field label="Description" error={errors.description?.message} htmlFor="exc-description">
            <textarea
              id="exc-description"
              rows={3}
              className="input"
              placeholder="Describe the issue…"
              {...register("description")}
            /></Field>
          <Field label="Expected behavior" error={errors.expected_behavior?.message} htmlFor="exc-expected">
            <textarea
              id="exc-expected"
              rows={3}
              className="input"
              placeholder="What should happen…"
              {...register("expected_behavior")}
            /></Field>
          <Field label="Actual behavior" error={errors.actual_behavior?.message} htmlFor="exc-actual">
            <textarea
              id="exc-actual"
              rows={3}
              className="input"
              placeholder="What actually happened…"
              {...register("actual_behavior")}
            /></Field>
          <Field label="Resolution status" error={errors.resolution_status?.message} htmlFor="exc-status">
            <select
              id="exc-status"
              className="input"
              {...register("resolution_status")}
            >
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </Field>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalMode(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              {modalMode === "create" ? "Create exception" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );

  return mainContent;
}

interface ExceptionRecord {
  exception_id: string;
  decision_id: string | null;
  issue_type: string;
  severity: string;
  sku: string;
  description: string;
  expected_behavior: string;
  actual_behavior: string;
  resolution_status: string;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}