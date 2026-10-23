import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Icon, Panel } from "@/lib/ui";
import { listAllParcels } from "@/lib/surecod";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SureCOD" },
      {
        name: "description",
        content: "Daily statistics of accepted (successful) vs. missed (unsuccessful) COD deliveries.",
      },
      { property: "og:title", content: "Dashboard — SureCOD" },
      {
        property: "og:description",
        content: "Daily statistics of accepted (successful) vs. missed (unsuccessful) COD deliveries.",
      },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const parcelsQuery = useQuery({ queryKey: ["all-parcels"], queryFn: listAllParcels });

  const parcels = parcelsQuery.data ?? [];
  const successfulParcels = parcels.filter((p) => p.parcel_status === "Confirmed Received");
  const missedParcels = parcels.filter((p) => p.parcel_status === "Missed / Returned");
  const pendingParcels = parcels.filter((p) => p.parcel_status === "Pending");

  const resolvedTotal = successfulParcels.length + missedParcels.length;
  const successRate = resolvedTotal > 0 ? Math.round((successfulParcels.length / resolvedTotal) * 100) : 0;
  const missedRate = resolvedTotal > 0 ? 100 - successRate : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navy Blue Banner */}
      <div className="navy-hero-banner rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-400/20 hover-lift">
        <div className="pointer-events-none absolute -right-10 -top-12 w-64 h-64 rounded-full bg-blue-500/25 blur-2xl" />
        <div className="pointer-events-none absolute right-24 -bottom-16 w-48 h-48 rounded-full bg-sky-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sky-300 text-xs font-medium mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Delivery Overview</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
              Everyday, we have this much delivery orders missed and accepted
            </h1>
            <p className="text-blue-100/80 text-xs sm:text-sm mt-2">
              Real-time breakdown of successful Cash-on-Delivery handoffs versus missed and returned parcels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/checkout"
              className="hover-glow-btn px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Icon name="shopping_cart_checkout" className="text-[16px]" />
              <span>Checkout</span>
            </Link>
            <Link
              to="/outcomes"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs flex items-center gap-2 transition-all hover:-translate-y-0.5"
            >
              <Icon name="fact_check" className="text-[16px] text-amber-300" />
              <span>Log Outcome ({pendingParcels.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics of Successful (Accepted) vs. Missed Parcels */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Panel className="p-6 bg-gradient-to-br from-blue-600/8 via-sky-500/5 to-emerald-500/8 border-primary/25" interactive>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Accepted / Successful Parcels
              </div>
              <div className="text-[11px] text-muted-foreground">Confirmed Received by Buyer</div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-blue-600/25">
              <Icon name="check_circle" className="text-[22px]" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-4xl font-bold text-foreground">
              {successfulParcels.length}
            </span>
            <span className="font-mono text-xs font-semibold text-trusted px-2.5 py-0.5 rounded-full bg-trusted/12 border border-trusted/25">
              {successRate}% of resolved orders
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-stone mt-4 overflow-hidden border border-primary/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(6, successRate)}%` }}
            />
          </div>
        </Panel>

        <Panel className="p-6 bg-gradient-to-br from-rose-500/8 via-orange-500/5 to-red-500/8 border-rto/25" interactive>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rto">
                Missed / Unsuccessful Parcels
              </div>
              <div className="text-[11px] text-muted-foreground">Missed Delivery or Returned to Sender</div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
              <Icon name="cancel" className="text-[22px]" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-heading text-4xl font-bold text-foreground">
              {missedParcels.length}
            </span>
            <span className="font-mono text-xs font-semibold text-rto px-2.5 py-0.5 rounded-full bg-rto/12 border border-rto/25">
              {missedRate}% of resolved orders
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-stone mt-4 overflow-hidden border border-rto/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-500"
              style={{ width: `${Math.max(6, missedRate)}%` }}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
