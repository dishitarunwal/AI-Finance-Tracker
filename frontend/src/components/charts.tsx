import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FlowPoint, CategorySlice } from "../lib/aggregate";
import { compactMoney, money, percent } from "../lib/format";

const INCOME = "#10b981";
const EXPENSE = "#f43f5e";
const AXIS = { fontSize: 12, fill: "#94a3b8" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as FlowPoint;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-lg shadow-slate-900/5">
      <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      <Row color={INCOME} label="Income" value={money(p.income)} />
      <Row color={EXPENSE} label="Expenses" value={money(p.expense)} />
      <div className="mt-1.5 border-t border-slate-100 pt-1.5">
        <Row label="Net" value={money(p.income - p.expense)} />
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-slate-600">
        {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
        {label}
      </span>
      <span className="tabular font-medium text-slate-900">{value}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BalanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as FlowPoint;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-lg shadow-slate-900/5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="tabular mb-1.5 text-base font-semibold text-slate-900">{money(p.balance ?? 0)}</p>
      <Row color={INCOME} label="In" value={money(p.income)} />
      <Row color={EXPENSE} label="Out" value={money(p.expense)} />
    </div>
  );
}

/** Running balance over time; each point carries that period's in/out for the tooltip. */
export function BalanceChart({ data }: { data: FlowPoint[] }) {
  const interval = data.length > 14 ? Math.ceil(data.length / 7) - 1 : 0;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g-balance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INCOME} stopOpacity={0.25} />
            <stop offset="100%" stopColor={INCOME} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eef0f3" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={interval} dy={8} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          tickFormatter={compactMoney}
          width={56}
          domain={["auto", "auto"]}
        />
        <Tooltip content={<BalanceTooltip />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#059669"
          strokeWidth={2.25}
          fill="url(#g-balance)"
          activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBars({ data }: { data: FlowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="#eef0f3" />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={8} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compactMoney} width={56} />
        <Tooltip content={<FlowTooltip />} cursor={{ fill: "#f1f5f9", radius: 8 }} />
        <Bar dataKey="income" fill={INCOME} radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expense" fill={EXPENSE} radius={[6, 6, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data, total }: { data: CategorySlice[]; total: number }) {
  return (
    <div className="relative size-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            innerRadius="72%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={6}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={({ active, payload }: any) =>
              active && payload?.length ? (
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg shadow-slate-900/5">
                  <p className="font-medium text-slate-900">{payload[0].payload.name}</p>
                  <p className="tabular text-slate-500">
                    {money(payload[0].payload.total)} · {percent(payload[0].payload.share)}
                  </p>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xs text-slate-500">Spent</p>
          <p className="tabular text-lg font-semibold tracking-tight text-slate-900">{compactMoney(total)}</p>
        </div>
      </div>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ backgroundColor: INCOME }} /> Income
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ backgroundColor: EXPENSE }} /> Expenses
      </span>
    </div>
  );
}
