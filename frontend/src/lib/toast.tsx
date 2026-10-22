import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleCheck, CircleAlert, Sparkles, X } from "lucide-react";
import clsx from "clsx";

type ToastKind = "success" | "error" | "ai";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

const ICONS = { success: CircleCheck, error: CircleAlert, ai: Sparkles };
const TONES = {
  success: "text-emerald-600 bg-emerald-50",
  error: "text-rose-600 bg-rose-50",
  ai: "text-violet-600 bg-violet-50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((ts) => ts.filter((t) => t.id !== id));

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => dismiss(id), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/5"
            >
              <span className={clsx("grid size-8 shrink-0 place-items-center rounded-lg", TONES[t.kind])}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                {t.body && <p className="mt-0.5 text-sm text-slate-500">{t.body}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
