import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Boxes,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { DEMO_ACCOUNTS } from "../lib/constants";
import { getErrorMessage } from "../lib/api";
import { InlineError, Spinner } from "../components/ui";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof schema>;

export default function Login() {
  const { user, login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@pricepilot.ai", password: "Admin@12345" },
  });

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const profile = await login(values.email, values.password);
      success("Signed in", `Welcome back, ${profile.full_name}.`);
      navigate(from, { replace: true });
    } catch (error) {
      const message = getErrorMessage(error);
      setServerError(message);
      toastError("Sign in failed", message);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(58,102,245,0.45), transparent 45%), radial-gradient(circle at 80% 70%, rgba(16,185,129,0.25), transparent 40%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-xl shadow-brand-900/50">
              <Activity className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight">PricePilot AI</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Dynamic Pricing &amp; Promotion Intelligence
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-lg text-4xl font-bold leading-tight tracking-tight">
            Every price decision,
            <span className="text-brand-300"> explainable and margin-safe.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Deterministic pricing with protected floors, promotion stacking validation, competitor
            freshness checks and a complete audit trail — powered by live PostgreSQL records.
          </p>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: "Floor & margin guardrails", body: "Blocked before they reach the storefront" },
              { icon: TrendingUp, title: "Signal-driven candidates", body: "Demand, stock and competitor context" },
              { icon: BadgeCheck, title: "Promotion stack control", body: "Eligibility and discount caps enforced" },
              { icon: Boxes, title: "Full traceability", body: "Decision history and immutable audit logs" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <item.icon className="h-5 w-5 text-brand-300" />
                <p className="mt-2 text-xs font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-slate-500">
          <Sparkles className="h-3.5 w-3.5" />
          Seed 20261022 · starter dataset · 100 SKUs · 30 days of history
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">PricePilot AI</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Decision Intelligence
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your workspace</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use a seeded demo account or your own provisioned credentials.
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="label" htmlFor="email">
                Work email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input pl-9"
                  placeholder="you@company.com"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs font-medium text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input pl-9"
                  placeholder="••••••••"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs font-medium text-rose-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && <InlineError message={serverError} />}

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Demo accounts
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setValue("email", account.email);
                    setValue("password", account.password);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
                >
                  <p className="text-xs font-semibold text-slate-800">{account.label}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">{account.email}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            PostgreSQL 18 · FastAPI · React + TypeScript · JWT authentication
          </p>
        </div>
      </section>
    </div>
  );
}
