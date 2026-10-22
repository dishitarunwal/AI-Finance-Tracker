import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Sparkles, ShieldCheck, ChartNoAxesColumn } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Layout";
import { Button, Field, Input, Segmented } from "../components/ui";

type Mode = "login" | "register";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password || (mode === "register" && !name)) {
      setError("Please fill in every field.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (mode === "login" && msg === "Invalid Credentials") setError("That email and password don't match.");
      else if (mode === "register" && msg.startsWith("Can't reach"))
        setError("Couldn't create the account. The email may already be registered, or the server is offline.");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute -right-32 -bottom-48 size-[480px] rounded-full bg-violet-500/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-emerald-400 to-emerald-600">
            <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
              <path d="M8 21l6-6 4 4 7-8" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">AI Finance</span>
        </div>

        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight">
            Your money, sorted
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">automatically.</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Log a transaction in plain words. Gemini reads it, picks the category and keeps your dashboard current.
          </p>

          {/* Mock preview card */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
            {[
              { e: "🚕", d: "Uber ride to airport", c: "Transportation", a: "−₹438.00" },
              { e: "🍽️", d: "Dinner at Barbeque Nation", c: "Food & Dining", a: "−₹1,862.15" },
              { e: "💰", d: "Salary credited", c: "Income", a: "+₹85,000.00", pos: true },
            ].map((r) => (
              <div key={r.d} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-white/[0.06]">{r.e}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.d}</p>
                  <p className="flex items-center gap-1 text-xs text-violet-300">
                    <Sparkles className="size-3" /> {r.c}
                  </p>
                </div>
                <span className={`tabular text-sm font-medium ${r.pos ? "text-emerald-300" : "text-slate-200"}`}>{r.a}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex gap-8 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-400" /> AI categories
            </span>
            <span className="flex items-center gap-2">
              <ChartNoAxesColumn className="size-4 text-emerald-400" /> Live analytics
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" /> JWT secured
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-white px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {mode === "login" ? "Sign in to see your dashboard." : "Start tracking in under a minute."}
          </p>

          <div className="mt-7">
            <Segmented<Mode>
              value={mode}
              onChange={(m) => {
                setMode(m);
                setError(null);
              }}
              options={[
                { value: "login", label: "Sign in" },
                { value: "register", label: "Sign up" },
              ]}
            />
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <Field label="Name">
                <Input autoComplete="name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

            <Button type="submit" loading={loading} className="h-11 w-full">
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
