// Thin typed wrapper around the FastAPI backend in /app.

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export interface Transaction {
  id: number;
  owner_id: number;
  amount: number; // positive = income, negative = expense
  description: string;
  date: string;
  category_id: number | null;
  is_ai_categorized: boolean;
}

export interface Stats {
  total_income: number;
  total_expenditure: number;
  net_balance: number;
}

export interface MonthlyStats extends Stats {
  month: number | null;
  year: number | null;
}

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface TransactionInput {
  amount: number;
  description: string;
  category_id: number | null;
  date?: string;
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function detailToMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  // FastAPI validation errors come back as a list of {loc, msg}
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = d.loc?.[d.loc.length - 1];
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(", ");
  }
  return "Unexpected error";
}

async function request<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}. Is the backend running?`);
  }

  if (res.status === 401 && token) unauthorizedHandler?.();

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) message = detailToMessage(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (body: unknown) => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

export const api = {
  login(email: string, password: string) {
    // OAuth2PasswordRequestForm expects form-encoded username/password
    const body = new URLSearchParams({ username: email, password });
    return request<{ access_token: string; token_type: string }>("/auth/login", { method: "POST", body });
  },

  register(name: string, email: string, password: string) {
    return request<User>("/users/", { method: "POST", ...json({ name, email, password }) });
  },

  getUser(token: string, id: number) {
    return request<User>(`/users/${id}`, { token });
  },

  getTransactions(
    token: string,
    params: { limit?: number; skip?: number; search?: string; sort_by?: "asc" | "desc" } = {},
  ) {
    const qs = new URLSearchParams();
    qs.set("limit", String(params.limit ?? 10));
    qs.set("skip", String(params.skip ?? 0));
    qs.set("sort_by", params.sort_by ?? "desc");
    if (params.search) qs.set("search", params.search);
    return request<Transaction[]>(`/transactions/?${qs}`, { token });
  },

  createTransaction(token: string, input: TransactionInput) {
    return request<Transaction>("/transactions/", { method: "POST", token, ...json(input) });
  },

  updateTransaction(token: string, id: number, input: TransactionInput) {
    return request<Transaction>(`/transactions/${id}`, { method: "PUT", token, ...json(input) });
  },

  deleteTransaction(token: string, id: number) {
    return request<void>(`/transactions/${id}`, { method: "DELETE", token });
  },

  getStats(token: string) {
    return request<Stats>("/transactions/stats", { token });
  },

  getMonthlyStats(token: string, month?: number, year?: number) {
    const qs = new URLSearchParams();
    if (month) qs.set("month", String(month));
    if (year) qs.set("year", String(year));
    return request<MonthlyStats>(`/transactions/custom_stats?${qs}`, { token });
  },
};

/** Reads the user id out of the JWT issued by /auth/login. */
export function userIdFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.user_id === "number" ? payload.user_id : Number(payload.user_id) || null;
  } catch {
    return null;
  }
}
