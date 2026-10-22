import type { Transaction } from "../api/client";
import { getCategory, type Category } from "./categories";

export interface FlowPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance?: number;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function bucket(txns: Transaction[], points: FlowPoint[], keyOf: (d: Date) => string) {
  const index = new Map(points.map((p) => [p.key, p]));
  for (const t of txns) {
    const p = index.get(keyOf(new Date(t.date)));
    if (!p) continue;
    if (t.amount >= 0) p.income += t.amount;
    else p.expense += -t.amount;
  }
  return points;
}

/** Daily income/expense totals for the last `days` days, zero-filled. */
export function flowByDay(txns: Transaction[], days: number): FlowPoint[] {
  const today = new Date();
  const points: FlowPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    points.push({
      key: dayKey(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      income: 0,
      expense: 0,
    });
  }
  return bucket(txns, points, dayKey);
}

/** Monthly income/expense totals for the last `months` months, zero-filled. */
export function flowByMonth(txns: Transaction[], months: number): FlowPoint[] {
  const today = new Date();
  const points: FlowPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    points.push({
      key: monthKey(d),
      label: d.toLocaleDateString(undefined, { month: "short" }),
      income: 0,
      expense: 0,
    });
  }
  return bucket(txns, points, monthKey);
}

export interface CategorySlice extends Category {
  total: number;
  count: number;
  share: number;
}

/** Expenses grouped by category, largest first. */
export function spendingByCategory(txns: Transaction[]): CategorySlice[] {
  const map = new Map<number, CategorySlice>();
  let sum = 0;
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const c = getCategory(t.category_id);
    const s = map.get(c.id) ?? { ...c, total: 0, count: 0, share: 0 };
    s.total += -t.amount;
    s.count += 1;
    sum += -t.amount;
    map.set(c.id, s);
  }
  return [...map.values()]
    .map((s) => ({ ...s, share: sum ? s.total / sum : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Adds the end-of-period running balance to each point, working back from today's balance. */
export function withBalance(points: FlowPoint[], currentBalance: number): FlowPoint[] {
  let running = currentBalance;
  const out = points.map((p) => ({ ...p }));
  for (let i = out.length - 1; i >= 0; i--) {
    out[i].balance = running;
    running -= out[i].income - out[i].expense;
  }
  return out;
}
