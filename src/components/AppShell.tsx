import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/lib/ui";
import { listPending } from "@/lib/surecod";

const NAV = [
  { to: "/", label: "Checkout", icon: "shopping_cart_checkout" },
  { to: "/outcomes", label: "Log Delivery Outcome", icon: "fact_check" },
  { to: "/risk", label: "Seller Risk Lookup", icon: "policy" },
  { to: "/appeals", label: "AI Buyer Appeals", icon: "gavel" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pending = useQuery({ queryKey: ["pending"], queryFn: listPending });
  const count = pending.data?.length ?? 0;
  // Below the lg breakpoint the sidebar becomes a slide-in drawer.
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <header className="lg:hidden sticky top-0 z-30 h-12 px-3 bg-sand border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <Icon name="verified_user" className="text-[16px]" />
          </div>
          <span className="font-heading text-sm font-bold">SureCOD</span>
        </div>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="w-9 h-9 -mr-1 rounded flex items-center justify-center hover:bg-stone">
          <Icon name={open ? "close" : "menu"} className="text-[22px]" />
        </button>
      </header>
      {open && <div className="lg:hidden fixed inset-0 z-30 bg-foreground/30" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`fixed left-0 top-0 bottom-0 w-[210px] bg-sand border-r border-border z-40 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div>
          <div className="h-14 px-4 border-b border-border flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Icon name="verified_user" className="text-[16px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold leading-tight">SureCOD</span>
              <span className="text-[10px] text-muted-foreground leading-none">Dispatch Integrity</span>
            </div>
          </div>
          <div className="p-3">
            <div className="px-2 pb-1.5 text-[10px] text-muted-foreground font-bold tracking-wider uppercase">Workflow</div>
            <nav className="flex flex-col gap-0.5">
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-muted-foreground hover:bg-stone hover:text-foreground border-l-2 border-transparent"
                  activeProps={{ className: "!bg-stone !text-foreground font-semibold !border-trusted" }}
                  activeOptions={{ exact: true }}>
                  <span className="flex items-center gap-2"><Icon name={n.icon} className="text-[16px]" />{n.label}</span>
                  {n.to === "/outcomes" && count > 0 && <span className="px-1.5 rounded-full font-mono text-[10px] bg-border text-foreground font-semibold">{count}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-border bg-ivory">
            <Icon name="lock" className="text-[14px] text-trusted" />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold">SHA-256 Privacy</span>
              <span className="font-mono text-[10px] text-muted-foreground">No raw phone stored</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-[210px]">
        <main className="pt-5 lg:pt-8 pb-8 min-h-screen px-4 sm:px-6 max-w-[1380px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
