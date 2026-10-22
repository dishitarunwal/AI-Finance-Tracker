import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Inbox, Plus, Sparkles, Wallet } from "lucide-react";
import clsx from "clsx";
import { api, type Transaction } from "../api/client";
import { useToken } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import { flowByDay, flowByMonth, spendingByCategory, withBalance } from "../lib/aggregate";
import { money, percent, shortDate, signedMoney } from "../lib/format";
import { useLayout } from "../components/Layout";
import { Button, Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Segmented, Skeleton } from "../components/ui";
import { BalanceChart, CategoryDonut } from "../components/charts";
import { AiBadge, CategoryIcon } from "../components/CategoryBadge";
import { getCategory } from "../lib/categories";

type Range = "30d" | "90d" | "12m";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const token = useToken();
  const { version, openForm } = useLayout();
  const [range, setRange] = useState<Range>("30d");

  const { data, error, loading, reload } = useAsync(async () => {
    const now = new Date();
    const [stats, month, txns] = await Promise.all([
      api.getStats(token),
      api.getMonthlyStats(token, now.getMonth() + 1, now.getFullYear()),
      api.getTransactions(token, { limit: 500 }),
    ]);
    return { stats, month, txns };
  }, [token, version]);

  const txns = data?.txns ?? [];
  const flow = useMemo(() => {
    const points = range === "30d" ? flowByDay(txns, 30) : range === "90d" ? flowByDay(txns, 90) : flowByMonth(txns, 12);
    return withBalance(points, data?.stats.net_balance ?? 0);
  }, [txns, range, data]);
  const periodIn = flow.reduce((s, p) => s + p.income, 0);
  const periodOut = flow.reduce((s, p) => s + p.expense, 0);
  const slices = useMemo(() => spendingByCategory(txns), [txns]);
  const spent = slices.reduce((s, c) => s + c.total, 0);
  const aiCount = txns.filter((t) => t.is_ai_categorized).length;

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <PageHeader
        title={greeting()}
        subtitle={today}
        action={
          <div className="hidden sm:block lg:hidden">
            <Button onClick={() => openForm()}>
              <Plus className="size-4" /> New transaction
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="relative col-span-2 overflow-hidden rounded-2xl bg-slate-900 sm:col-span-1 p-5 text-white shadow-lg shadow-slate-900/10">
          <div className="absolute -top-16 -right-10 size-44 rounded-full bg-emerald-500/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Wallet className="size-4" /> Net balance
            </div>
            {loading && !data ? (
              <Skeleton className="mt-3 h-8 w-36 opacity-20" />
            ) : (
              <p className="tabular mt-2 text-[28px] font-semibold tracking-tight">{money(data?.stats.net_balance ?? 0)}</p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              This month{" "}
              <span className={clsx("tabular font-medium", (data?.month.net_balance ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300")}>
                {signedMoney(data?.month.net_balance ?? 0)}
              </span>
            </p>
          </div>
        </div>
        <StatCard
          label="Income"
          icon={<ArrowDownLeft className="size-4" />}
          tone="emerald"
          value={data?.stats.total_income}
          month={data?.month.total_income}
          loading={loading && !data}
        />
        <StatCard
          label="Expenses"
          icon={<ArrowUpRight className="size-4" />}
          tone="rose"
          value={data?.stats.total_expenditure}
          month={data?.month.total_expenditure}
          loading={loading && !data}
        />
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Balance"
            subtitle={range === "12m" ? "Last 12 months" : `Last ${range === "30d" ? 30 : 90} days`}
            action={
              <Segmented<Range>
                value={range}
                onChange={setRange}
                options={[
                  { value: "30d", label: "30D" },
                  { value: "90d", label: "90D" },
                  { value: "12m", label: "12M" },
                ]}
              />
            }
          />
          <div className="flex gap-6 px-5 pt-4 text-sm">
            <span className="text-slate-500">
              In <span className="tabular font-semibold text-emerald-600">{signedMoney(periodIn)}</span>
            </span>
            <span className="text-slate-500">
              Out <span className="tabular font-semibold text-rose-600">{signedMoney(-periodOut)}</span>
            </span>
          </div>
          <div className="h-64 px-2 pt-2 pb-4">{loading && !data ? <Skeleton className="mx-3 h-full" /> : <BalanceChart data={flow} />}</div>
        </Card>

        <Card>
          <CardHeader title="Spending by category" subtitle="Across your recent transactions" />
          {loading && !data ? (
            <div className="p-5">
              <Skeleton className="mx-auto size-40 rounded-full" />
            </div>
          ) : slices.length === 0 ? (
            <EmptyState icon={<Inbox className="size-5" />} title="No expenses yet" body="Add an expense to see where your money goes." />
          ) : (
            <div className="p-5">
              <div className="mx-auto size-40">
                <CategoryDonut data={slices} total={spent} />
              </div>
              <ul className="mt-5 space-y-2.5">
                {slices.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 truncate text-slate-600">{s.name}</span>
                    <span className="tabular text-slate-400">{percent(s.share)}</span>
                    <span className="tabular w-24 text-right font-medium text-slate-900">{money(s.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Recent + AI */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            action={
              <Link to="/transactions" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">
                View all <ArrowRight className="size-4" />
              </Link>
            }
          />
          <div className="p-2 pt-3">
            {loading && !data ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : txns.length === 0 ? (
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="No transactions yet"
                body="Your latest income and expenses will show up here."
                action={
                  <Button onClick={() => openForm()} size="sm">
                    <Plus className="size-4" /> Add your first
                  </Button>
                }
              />
            ) : (
              <ul>
                {txns.slice(0, 6).map((t) => (
                  <RecentRow key={t.id} t={t} onClick={() => openForm(t)} />
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-56 rounded-full bg-violet-200/50 blur-3xl" />
          <div className="relative flex h-full flex-col p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
              <Sparkles className="size-5" />
            </span>
            <h2 className="mt-4 text-[15px] font-semibold text-slate-900">AI categorization</h2>
            <p className="mt-1 text-sm text-slate-500">Transactions Gemini sorted for you, no manual tagging needed.</p>
            <div className="mt-5 flex items-end gap-2">
              <span className="tabular text-4xl font-semibold tracking-tight text-slate-900">
                {txns.length ? percent(aiCount / txns.length) : "—"}
              </span>
              <span className="pb-1.5 text-sm text-slate-500">
                {aiCount} of {txns.length}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                style={{ width: txns.length ? `${(aiCount / txns.length) * 100}%` : 0 }}
              />
            </div>
            <Link
              to="/insights"
              className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-violet-700 hover:text-violet-800"
            >
              See insights <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  label,
  icon,
  tone,
  value,
  month,
  loading,
}: {
  label: string;
  icon: React.ReactNode;
  tone: "emerald" | "rose";
  value?: number;
  month?: number;
  loading: boolean;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span
          className={clsx(
            "grid size-6 place-items-center rounded-md",
            tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="tabular mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{money(value ?? 0)}</p>
      )}
      <p className="mt-2 text-xs text-slate-500 sm:mt-3">
        This month <span className="tabular font-medium text-slate-700">{money(month ?? 0)}</span>
      </p>
    </Card>
  );
}

function RecentRow({ t, onClick }: { t: Transaction; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50">
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
  );
}
