import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Calculator,
  ClipboardCheck,
  Gauge,
  History,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Swords,
  TicketPercent,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { titleCase } from "../lib/format";

const navGroups: Array<{
  label: string;
  items: Array<{ to: string; label: string; icon: typeof Gauge }>;
}> = [
  {
    label: "Developer Hub",
    items: [
      { to: "/developer-profile", label: "Developer Profile", icon: Gauge },
    ],
  },
  {
    label: "Overview",
    items: [
      { to: "/", label: "Executive Dashboard", icon: Gauge },
      { to: "/analytics", label: "Analytics & Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Catalog & Signals",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/costs", label: "Costs", icon: ShoppingBag },
      { to: "/inventory", label: "Inventory", icon: Warehouse },
      { to: "/competitors", label: "Competitors", icon: Swords },
    ],
  },
  {
    label: "Pricing Operations",
    items: [
      { to: "/simulator", label: "Pricing Simulator", icon: Calculator },
      { to: "/decisions", label: "Decision Center", icon: ClipboardCheck },
      { to: "/promotions", label: "Promotions", icon: TicketPercent },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/exceptions", label: "Exceptions", icon: AlertTriangle },
      { to: "/audit", label: "Audit History", icon: History },
    ],
  },
  {
    label: "System",
    items: [],
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40">
        <Activity className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-white">PricePilot AI</p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Decision Intelligence
        </p>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current =
    navGroups.flatMap((group) => group.items).find((item) => item.to === location.pathname)?.label ??
    "PricePilot AI";

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-900">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button
          type="button"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "nav-link-active" : ""}`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-200 ring-1 ring-inset ring-brand-400/30">
            {(user?.full_name || "U")
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user?.full_name}</p>
            <p className="truncate text-[10px] text-slate-400">{titleCase(user?.role)}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
          <Boxes className="h-3 w-3" /> PostgreSQL 18 · FastAPI · React
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fadeIn">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{current}</p>
                <p className="truncate text-[11px] text-slate-500">
                  Dynamic Pricing &amp; Promotion Decision Intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data
              </span>
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 md:inline-flex">
                AS_OF 2026-01-31
              </span>
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                {user?.role?.replace("_", " ")}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
