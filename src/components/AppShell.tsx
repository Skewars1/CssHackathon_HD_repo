import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "@/lib/ui";
import { listPending } from "@/lib/surecod";

const NAV = [
  { to: "/", label: "Dashboard", sub: "Live Delivery Stats", icon: "space_dashboard" },
  { to: "/checkout", label: "Checkout", sub: "COD Risk Gate", icon: "shopping_cart_checkout" },
  { to: "/outcomes", label: "Delivery Outcomes", sub: "Resolve Parcels", icon: "fact_check" },
  { to: "/risk", label: "Seller Risk Lookup", sub: "0–100 Buyer Ledger", icon: "policy" },
  { to: "/appeals", label: "AI Review", sub: "Evidence Pre-Screen", icon: "gavel" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pending = useQuery({ queryKey: ["pending"], queryFn: listPending });
  const count = pending.data?.length ?? 0;
  const [open, setOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const activeNav = NAV.find((n) => n.to === location.pathname) ?? NAV[0];
  const todayLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleQuickSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/risk" });
  };

  return (
    <div className="min-h-screen navy-sidebar-bg text-foreground flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 navy-sidebar-bg border-b border-white/10 flex items-center justify-between text-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Icon name="verified_user" className="text-[18px]" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-base font-bold leading-none">SureCOD</span>
            <span className="text-[10px] text-blue-200/75">0–100 Trust Engine</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <Link
              to="/outcomes"
              className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[11px] font-semibold"
            >
              {count} pending
            </Link>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Icon name={open ? "close" : "menu"} className="text-[22px]" />
          </button>
        </div>
      </header>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-xs"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Deep Navy Sidebar (Reference-Inspired) */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[248px] navy-sidebar-bg text-white z-40 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Operator / Brand Profile Header */}
          <div className="pt-7 pb-5 px-5 flex flex-col items-center text-center border-b border-white/10">
            <div className="relative mb-2.5 group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 p-0.5 shadow-lg shadow-blue-500/30 transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-[14px] bg-[#0B1437] flex items-center justify-center">
                  <Icon name="shield_lock" className="text-[28px] text-sky-400" />
                </div>
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0B1437]"
                title="System Online"
              />
            </div>
            <span className="font-heading text-base font-bold tracking-tight text-white">SureCOD</span>
            <span className="text-[11px] text-blue-200/70 font-medium">COD Trust &amp; Dispatch OS</span>
          </div>

          {/* Navigation Links with Protruding Pill Active State */}
          <div className="py-5 pr-3 pl-3">
            <div className="px-3 pb-2 text-[10px] text-blue-300/60 font-bold tracking-widest uppercase">
              Control Center
            </div>
            <nav className="flex flex-col gap-1.5">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-blue-100/75 hover:text-white hover:bg-white/10 hover:translate-x-1 transition-all duration-200"
                  activeProps={{
                    className:
                      "!bg-gradient-to-r !from-blue-600 !to-sky-500 !text-white font-semibold shadow-lg shadow-blue-600/35 translate-x-1",
                  }}
                  activeOptions={{ exact: n.to === "/" }}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                      <Icon name={n.icon} className="text-[18px]" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs font-semibold leading-tight">{n.label}</span>
                      <span className="text-[10px] opacity-75 leading-tight">{n.sub}</span>
                    </span>
                  </span>
                  {n.to === "/outcomes" && count > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-amber-400 text-slate-950 font-bold shadow-xs">
                      {count}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Score Legend & Privacy Pill */}
        <div className="p-4 space-y-2.5 border-t border-white/10">
          <div className="rounded-xl bg-white/6 border border-white/10 p-3 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-sky-300">
              <span>0–100 Trust Scale</span>
              <span className="font-mono text-[10px] bg-blue-500/30 px-1.5 py-0.5 rounded">Start: 50</span>
            </div>
            <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-blue-100/80">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Trusted &gt;70
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Neutral 35–69
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Watch &lt;35
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Risk ≤20
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Icon name="lock" className="text-[15px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-white">SHA-256 Privacy</span>
              <span className="font-mono text-[9px] text-blue-200/70">Zero raw PII stored</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Rounded Light Canvas Area (Reference-Inspired) */}
      <div className="flex-1 lg:pl-[248px] min-h-screen flex flex-col">
        <div className="flex-1 bg-canvas lg:my-3 lg:mr-3 lg:rounded-[30px] shadow-2xl overflow-hidden flex flex-col border border-white/60">
          {/* Top Inner Utility Bar */}
          <div className="px-4 sm:px-7 pt-4 pb-3 border-b border-border/70 bg-ivory/75 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-1 min-w-[220px]">
              <span className="font-heading text-lg font-bold text-foreground hidden sm:inline">
                {activeNav.label}
              </span>
              <form onSubmit={handleQuickSearch} className="relative flex-1 max-w-md">
                <Icon
                  name="search"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[16px]"
                />
                <input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Quick lookup buyer profile or hash (press Enter)…"
                  className="w-full pl-9 pr-4 py-1.5 rounded-full bg-stone/90 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-ivory transition-all"
                />
              </form>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone/80 border border-border text-xs font-medium text-foreground">
                <Icon name="calendar_today" className="text-[14px] text-primary" />
                <span>{todayLabel}</span>
              </div>

              <Link
                to="/checkout"
                className="hover-glow-btn px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Icon name="add_shopping_cart" className="text-[15px]" />
                <span>New Order</span>
              </Link>

              <Link
                to="/outcomes"
                title="Pending Parcels"
                className="relative w-9 h-9 rounded-full bg-stone border border-border flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Icon name="notifications" className="text-[18px]" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rto text-white font-mono text-[9px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <main className="flex-1 pt-5 pb-10 px-4 sm:px-7 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
