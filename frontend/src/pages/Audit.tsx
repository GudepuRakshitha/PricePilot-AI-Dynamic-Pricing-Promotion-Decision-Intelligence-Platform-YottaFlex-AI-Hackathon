import { useEffect, useState } from "react";
import { useApiQuery } from "../hooks/useApiQuery";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { canWrite } from "../lib/constants";
import { dateLabel } from "../lib/format";
import type { AuditList } from "../types";
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

export default function Audit() {
  const { user } = useAuth();
  const toast = useToast();

  const [entityType, setEntityType] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [actor, setActor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const audit = useApiQuery<AuditList>(
    () =>
      api
        .get<AuditList>("/audit", {
          params: {
            skip: (page - 1) * pageSize,
            limit: pageSize,
            entity_type: entityType || undefined,
            action: action || undefined,
            actor: actor || undefined,
            search: search || undefined,
          },
        })
        .then((r) => r.data),
    [entityType, action, actor, search, page],
  );

  const facets = useApiQuery<Record<string, string[]>>(
    () => api.get("/audit/facets").then((r) => r.data),
  );

  const onFilterChange = (filters: {
    entity_type?: string;
    action?: string;
    actor?: string;
    search?: string;
  }) => {
    setEntityType(filters.entity_type);
    setAction(filters.action);
    setActor(filters.actor);
    setSearch(filters.search);
    setPage(1);
  };

  const list = audit.data?.items ?? [];
  const total = audit.data?.total ?? 0;

  return (
    <>
      <PageHeader
        icon={History}
        title="Audit History"
        subtitle="Immutable log of all system actions. Full traceability for compliance and debugging."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onFilterChange({})}
            >
              <RefreshCw className="h-4 w-4" /> Reset
            </button>
            {canWrite(user?.role) && (
              <select
                className="input"
                onChange={(e) => onFilterChange({ entity_type: e.target.value })}
              >
                <option value="">All entity types</option>
                {(facets.data?.entity_types ?? []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
            {canWrite(user?.role) && (
              <select
                className="input"
                onChange={(e) => onFilterChange({ action: e.target.value })}
              >
                <option value="">All actions</option>
                {(facets.data?.actions ?? []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
            {canWrite(user?.role) && (
              <select
                className="input"
                onChange={(e) => onFilterChange({ actor: e.target.value })}
              >
                <option value="">All actors</option>
                {(facets.data?.actors ?? []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
            <Field
              label="Search"
              hint="Entity ID, action or description"
              htmlFor="audit-search"
            >
              <input
                id="audit-search"
                className="input pl-9"
                placeholder="Search…"
                value={search}
                onChange={(e) => onFilterChange({ search: e.target.value })}
              />
            </Field>
          </>
        }
      />

      {audit.loading ? (
        <LoadingState label="Loading audit logs…" />
      ) : audit.error ? (
        <ErrorState message={audit.error} onRetry={audit.reload} />
      ) : list.length === 0 ? (
        <EmptyState
          title="No audit records match"
          message="Apply filters to find specific actions."
          icon={ShieldCheck}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">ID</th>
                  <th className="th">Entity</th>
                  <th className="th">Entity ID</th>
                  <th className="th">Action</th>
                  <th className="th">Actor</th>
                  <th className="th text-right">Details</th>
                  <th className="th">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="td font-mono text-[11px] text-slate-500">
                      {entry.id}
                    </td>
                    <td className="td">{entry.entity_type}</td>
                    <td className="td font-mono text-xs text-slate-500">
                      {entry.entity_id}
                    </td>
                    <td className="td font-medium text-slate-600">
                      {entry.action}
                    </td>
                    <td className="td font-mono text-xs text-slate-500">
                      {entry.actor}
                    </td>
                    <td className="td text-sm text-slate-500">
                      {JSON.stringify(entry.details)}
                    </td>
                    <td className="td text-xs text-slate-500">
                      {dateLabel(entry.created_at)}
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
    </>
  );
}