import { useEffect, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Inbox, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { api, type Transaction } from "../api/client";
import { useToken } from "../lib/auth";
import { useToast } from "../lib/toast";
import { useAsync, useDebounced } from "../lib/useAsync";
import { longDate, shortDate, signedMoney, time } from "../lib/format";
import { useLayout } from "../components/Layout";
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Skeleton } from "../components/ui";
import { AiBadge, CategoryBadge, CategoryIcon } from "../components/CategoryBadge";
import { getCategory } from "../lib/categories";

const PAGE_SIZES = [10, 25, 50, 100];

export default function Transactions() {
  const token = useToken();
  const toast = useToast();
  const { version, refresh, openForm } = useLayout();

  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => setPage(0), [search, sort, pageSize]);

  // Fetch one extra row to know whether there is a next page.
  const { data, error, loading, reload } = useAsync(
    () => api.getTransactions(token, { limit: pageSize + 1, skip: page * pageSize, search, sort_by: sort }),
    [token, version, search, sort, pageSize, page],
  );
  const rows = (data ?? []).slice(0, pageSize);
  const hasNext = (data?.length ?? 0) > pageSize;

  async function remove(t: Transaction) {
    try {
      await api.deleteTransaction(token, t.id);
      toast({ kind: "success", title: "Transaction deleted", body: t.description });
      setConfirmId(null);
      refresh();
    } catch (e) {
      toast({ kind: "error", title: "Couldn't delete", body: e instanceof Error ? e.message : String(e) });
    }
  }

  const first = page * pageSize + 1;
  const last = page * pageSize + rows.length;

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Every expense and deposit, categorized."
        action={
          <div className="hidden sm:block">
            <Button onClick={() => openForm()}>
              <Plus className="size-4" /> New transaction
            </Button>
          </div>
        }
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-0 flex-1 basis-60">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search descriptions…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-9 pl-9 text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button variant="secondary" onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}>
            <ArrowDownUp className="size-4" />
            {sort === "desc" ? "Newest first" : "Oldest first"}
          </Button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={reload} />
          </div>
        )}

        {loading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 && !error ? (
          <EmptyState
            icon={search ? <Search className="size-5" /> : <Inbox className="size-5" />}
            title={search ? `No matches for “${search}”` : "No transactions yet"}
            body={search ? "Search matches descriptions and is case-sensitive." : "Add one and let the AI categorize it for you."}
            action={
              !search && (
                <Button size="sm" onClick={() => openForm()}>
                  <Plus className="size-4" /> New transaction
                </Button>
              )
            }
          />
        ) : (
          <div className={clsx("transition-opacity", loading && "opacity-60")}>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th className="py-3 pl-5 font-medium">Transaction</th>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 pr-5 text-right font-medium">Amount</th>
                  <th className="w-24 py-3 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => (
                  <tr key={t.id} className="group transition hover:bg-slate-50/70">
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <CategoryIcon id={t.category_id} size="sm" />
                        <span className="font-medium text-slate-900">{t.description}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <CategoryBadge id={t.category_id} ai={t.is_ai_categorized} />
                    </td>
                    <td className="py-3 text-slate-500">
                      {longDate(t.date)}
                      <span className="ml-1.5 text-slate-400">{time(t.date)}</span>
                    </td>
                    <td
                      className={clsx(
                        "tabular py-3 pr-5 text-right font-semibold",
                        t.amount >= 0 ? "text-emerald-600" : "text-slate-900",
                      )}
                    >
                      {signedMoney(t.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      {confirmId === t.id ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => remove(t)}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                          <IconButton label="Edit" onClick={() => openForm(t)}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton label="Delete" onClick={() => setConfirmId(t.id)} danger>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((t) => (
                <li key={t.id}>
                  <button onClick={() => openForm(t)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <CategoryIcon id={t.category_id} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        {getCategory(t.category_id).name} · {shortDate(t.date)}
                        {t.is_ai_categorized && <AiBadge />}
                      </p>
                    </div>
                    <span className={clsx("tabular text-sm font-semibold", t.amount >= 0 ? "text-emerald-600" : "text-slate-900")}>
                      {signedMoney(t.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {(rows.length > 0 || page > 0) && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span className="tabular">{rows.length ? `Showing ${first}–${last}` : "No more results"}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "rounded-lg p-2 text-slate-400 transition",
        danger ? "hover:bg-rose-50 hover:text-rose-600" : "hover:bg-slate-100 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}
