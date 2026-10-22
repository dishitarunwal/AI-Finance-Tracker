import { useMemo, useState } from "react";
import { CircleCheck, Flame, PiggyBank, Sparkles, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { api } from "../api/client";
import { useToken } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import { flowByMonth, spendingByCategory } from "../lib/aggregate";
import { MONTHS, longDate, money, percent, signedMoney } from "../lib/format";
import { useLayout } from "../components/Layout";
import { Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Skeleton } from "../components/ui";
import { ChartLegend, MonthlyBars } from "../components/charts";
import { CategoryIcon } from "../components/CategoryBadge";

export default function Insights() {
  const token = useToken();
  const { version, openForm } = useLayout();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const txnsQ = useAsync(() => api.getTransactions(token, { limit: 500 }), [token, version]);
  const monthQ = useAsync(() => api.getMonthlyStats(token, month, year), [token, version, month, year]);

  const txns = txnsQ.data ?? [];
  const trend = useMemo(() => flowByMonth(txns, 6), [txns]);
  const slices = useMemo(() => spendingByCategory(txns), [txns]);
  const topExpenses = useMemo(() => [...txns].filter((t) => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 5), [txns]);
  const uncategorized = txns.filter((t) => t.category_id == null);
  const aiCount = txns.filter((t) => t.is_ai_categorized).length;
  const manualCount = txns.length - aiCount - uncategorized.length;

  const m = monthQ.data;
  const savingsRate = m && m.total_income > 0 ? m.net_balance / m.total_income : null;

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const loadingTxns = txnsQ.loading && !txnsQ.data;

  return (
    <>
      <PageHeader title="AI Insights" subtitle="What your spending says, and how the AI is sorting it." />

      {(txnsQ.error || monthQ.error) && (
        <div className="mb-6">
          <ErrorBanner
            message={(txnsQ.error ?? monthQ.error)!}
            onRetry={() => {
              txnsQ.reload();
              monthQ.reload();
            }}
          />
        </div>
      )}

      {/* Monthly report */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Monthly report</h2>
            <p className="mt-0.5 text-sm text-slate-500">Totals for the month you pick</p>
          </div>
          <div className="flex gap-2">
            <Select value={month} onChange={setMonth} options={MONTHS.map((name, i) => ({ value: i + 1, label: name }))} />
            <Select value={year} onChange={setYear} options={years.map((y) => ({ value: y, label: String(y) }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl bg-slate-100 mt-5 border-t border-slate-100 lg:grid-cols-4">
          <Metric label="Income" value={m && money(m.total_income)} tone="text-emerald-600" loading={monthQ.loading} />
          <Metric label="Expenses" value={m && money(m.total_expenditure)} tone="text-rose-600" loading={monthQ.loading} />
          <Metric
            label="Net"
            value={m && signedMoney(m.net_balance)}
            tone={m && m.net_balance < 0 ? "text-rose-600" : "text-slate-900"}
            loading={monthQ.loading}
          />
          <Metric
            label="Savings rate"
            value={savingsRate == null ? "—" : percent(savingsRate)}
            tone="text-slate-900"
            loading={monthQ.loading}
            icon={<PiggyBank className="size-4 text-slate-400" />}
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader title="6-month trend" subtitle="Income and expenses by month" action={<ChartLegend />} />
          <div className="h-64 px-2 pt-4 pb-4">{loadingTxns ? <Skeleton className="mx-3 h-full" /> : <MonthlyBars data={trend} />}</div>
        </Card>

        {/* AI breakdown */}
        <Card className="relative overflow-hidden">
          <div className="absolute -top-24 -right-16 size-56 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="relative p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-violet-100 text-violet-600">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-[15px] font-semibold text-slate-900">How it was sorted</h2>
            </div>
            {loadingTxns ? (
              <Skeleton className="mt-5 h-24" />
            ) : (
              <>
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {txns.length > 0 && (
                    <>
                      <div className="bg-violet-500" style={{ width: `${(aiCount / txns.length) * 100}%` }} />
                      <div className="bg-slate-400" style={{ width: `${(manualCount / txns.length) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(uncategorized.length / txns.length) * 100}%` }} />
                    </>
                  )}
                </div>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <Legend color="bg-violet-500" label="By AI" value={aiCount} />
                  <Legend color="bg-slate-400" label="Set manually" value={manualCount} />
                  <Legend color="bg-amber-400" label="Uncategorized" value={uncategorized.length} />
                </ul>
                <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                  Choose <span className="font-medium text-violet-700">Let AI decide</span> when adding a transaction and
                  Gemini picks the category from its description.
                </p>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Category bars */}
        <Card>
          <CardHeader title="Where the money goes" subtitle="Expenses by category" />
          <div className="p-5">
            {loadingTxns ? (
              <Skeleton className="h-48" />
            ) : slices.length === 0 ? (
              <EmptyState icon={<PiggyBank className="size-5" />} title="Nothing spent yet" />
            ) : (
              <ul className="space-y-4">
                {slices.map((s) => (
                  <li key={s.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span>{s.emoji}</span> {s.name}
                        <span className="font-normal text-slate-400">· {s.count}</span>
                      </span>
                      <span className="tabular font-medium text-slate-900">{money(s.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(s.share * 100, 2)}%`, backgroundColor: s.color }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {/* Top expenses */}
          <Card>
            <CardHeader title="Biggest expenses" subtitle="Your five largest outgoing payments" />
            <div className="p-2 pt-3">
              {loadingTxns ? (
                <Skeleton className="m-3 h-40" />
              ) : topExpenses.length === 0 ? (
                <EmptyState icon={<Flame className="size-5" />} title="No expenses yet" />
              ) : (
                <ol>
                  {topExpenses.map((t, i) => (
                    <li key={t.id}>
                      <button
                        onClick={() => openForm(t)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                      >
                        <span className="tabular w-4 text-xs font-medium text-slate-400">{i + 1}</span>
                        <CategoryIcon id={t.category_id} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
                          <p className="text-xs text-slate-500">{longDate(t.date)}</p>
                        </div>
                        <span className="tabular text-sm font-semibold text-slate-900">{money(-t.amount)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>

          {/* Needs attention */}
          <Card className={clsx(uncategorized.length > 0 && "border-amber-200 bg-amber-50/40")}>
            <div className="flex items-start gap-3 p-5">
              {uncategorized.length > 0 ? (
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
              ) : (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-slate-900">
                  {uncategorized.length > 0 ? `${uncategorized.length} need a category` : "Everything is categorized"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {uncategorized.length > 0
                    ? "The AI couldn't place these. Pick a category to keep reports accurate."
                    : "Nice — every transaction has a home."}
                </p>
                {uncategorized.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {uncategorized.slice(0, 4).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-amber-100">
                        <span className="truncate text-slate-700">{t.description}</span>
                        <button onClick={() => openForm(t)} className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-800">
                          Categorize
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  tone,
  loading,
  icon,
}: {
  label: string;
  value?: string | null;
  tone: string | null | undefined;
  loading: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
        {icon}
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className={clsx("tabular mt-1 text-xl font-semibold tracking-tight", tone)}>{value ?? "—"}</p>
      )}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={clsx("size-2.5 rounded-full", color)} />
      <span className="flex-1 text-slate-600">{label}</span>
      <span className="tabular font-medium text-slate-900">{value}</span>
    </li>
  );
}

function Select<T extends number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as T)}
      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
