import { useState } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { ArrowLeftRight, LayoutDashboard, LogOut, Plus, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../lib/auth";
import type { Transaction } from "../api/client";
import TransactionForm from "./TransactionForm";
import { Button } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/insights", label: "AI Insights", icon: Sparkles },
];

export interface LayoutContext {
  /** Bumps whenever a transaction is created, edited or deleted, so pages can refetch. */
  version: number;
  refresh: () => void;
  openForm: (txn?: Transaction) => void;
}

export const useLayout = () => useOutletContext<LayoutContext>();

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm shadow-emerald-700/30">
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
          <path d="M8 21l6-6 4 4 7-8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-slate-900">AI Finance</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<{ open: boolean; txn?: Transaction }>({ open: false });

  const ctx: LayoutContext = {
    version,
    refresh: () => setVersion((v) => v + 1),
    openForm: (txn) => setForm({ open: true, txn }),
  };

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:flex">
        <div className="px-2">
          <Logo />
        </div>

        <Button className="mt-7 w-full" onClick={() => ctx.openForm()}>
          <Plus className="size-4" /> New transaction
        </Button>

        <nav className="mt-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user?.email ?? "Signed in"}</p>
              {user && (
                <p className="text-xs text-slate-500">
                  Member since {new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Log out">
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
        <Outlet context={ctx} />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="relative mx-auto grid max-w-md grid-cols-4">
          {NAV.slice(0, 2).map((n) => (
            <MobileTab key={n.to} {...n} />
          ))}
          <div className="grid place-items-center">
            <button
              onClick={() => ctx.openForm()}
              className="-mt-6 grid size-13 place-items-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/25"
              aria-label="New transaction"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <MobileTab {...NAV[2]} label="Insights" />
        </div>
      </nav>

      <TransactionForm
        open={form.open}
        transaction={form.txn}
        onClose={() => setForm({ open: false })}
        onSaved={ctx.refresh}
      />
    </div>
  );
}

function MobileTab({ to, label, icon: Icon, end }: (typeof NAV)[number]) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
          isActive ? "text-emerald-700" : "text-slate-500",
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}
