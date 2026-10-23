import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crumbs, Icon, Impact, Panel, RiskBadge, StatusBadge, riskStyle } from "@/lib/ui";
import { listParcels, listProfiles, shortHash } from "@/lib/surecod";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Seller Risk Lookup — SureCOD" },
      { name: "description", content: "Search anonymized buyer profiles by account ID or phone hash." },
      { property: "og:title", content: "Seller Risk Lookup — SureCOD" },
      { property: "og:description", content: "Search anonymized buyer profiles by account ID or phone hash." },
    ],
  }),
  component: Risk,
});

function Risk() {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const profiles = useQuery({ queryKey: ["profiles", q], queryFn: () => listProfiles(q) });
  const list = profiles.data ?? [];
  const p = list.find((x) => x.account_id === sel) ?? null;
  const parcels = useQuery({ queryKey: ["parcels", sel], queryFn: () => listParcels(sel!), enabled: !!sel });

  return (
    <>
      <Crumbs items={["SureCOD", "Risk Engine", "Buyer Lookup"]} />
      <div className="flex flex-wrap items-end justify-between gap-3 mt-4 mb-5">
        <h1 className="font-heading text-2xl font-bold">Seller Risk Lookup</h1>
        <div className="relative flex items-center w-full sm:w-auto">
          <Icon name="search" className="absolute left-2.5 text-muted-foreground text-[16px]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ACC-XXXX or phone hash…"
            className="w-full sm:w-80 pl-8 pr-3 py-1.5 bg-ivory border border-border rounded font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:border-foreground" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-5">
        <Panel className="overflow-hidden h-fit">
          <div className="flex justify-between px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm">Profiles Directory</h2><span className="font-mono text-[11px] text-muted-foreground">{list.length} profiles</span></div>
          {profiles.isLoading && <div className="px-4 py-6 text-xs text-muted-foreground">Loading…</div>}
          {!profiles.isLoading && list.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted-foreground">{q ? "No matching profiles." : "No buyer profiles yet. They appear after a checkout."}</div>}
          {list.map((x) => (
            <button key={x.id} onClick={() => setSel(x.account_id)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2 border-l-4 border-b border-b-border ${sel === x.account_id ? "bg-stone border-l-trusted" : "border-l-transparent hover:bg-stone/50"}`}>
              <span className="flex flex-col font-mono text-xs"><span className="font-semibold">{x.account_id}</span><span className="text-[10px] text-muted-foreground">{shortHash(x.phone_hash)}</span></span>
              <span className="flex items-center gap-2"><span className="font-mono text-sm font-semibold">{x.trust_score}</span><RiskBadge risk={x.risk_factor} /></span>
            </button>
          ))}
        </Panel>

        {!p ? (
          <Panel className="py-20 text-center text-sm text-muted-foreground">Select a profile to view its live stats.</Panel>
        ) : (
          <div className="space-y-4">
            <Panel className="p-5">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="font-heading text-5xl font-bold">{p.trust_score}</div>
                  <span className={`inline-flex items-center gap-1 mt-1 font-mono text-xs font-semibold ${riskStyle(p.risk_factor).text}`}><span className={`w-2 h-2 rounded-full ${riskStyle(p.risk_factor).dot}`} />{p.risk_factor}</span>
                </div>
                <div className="flex-1 min-w-[240px] font-mono text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold"><Icon name="badge" className="text-[16px] text-muted-foreground" />{p.account_id}</div>
                  <div className="text-muted-foreground break-all"><Icon name="lock" className="text-[12px] text-trusted" /> sha256_{p.phone_hash}</div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3 font-mono text-center">
                  {([[p.confirmed_deliveries, "Confirmed"], [p.missed_returned_count, "Missed / Returned"], [p.pending_count, "Pending"]] as const).map(([n, l]) => (
                    <div key={l}><div className="text-2xl font-semibold">{n}</div><div className="text-[10px] uppercase text-muted-foreground">{l}</div></div>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border"><h2 className="font-heading font-semibold">Transaction History</h2></div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-stone text-muted-foreground text-[10px] uppercase tracking-wider">
                  <tr>{["Order ID", "Date", "Parcel Status", "Reason", "Impact on Score"].map((h) => <th key={h} className="text-left px-5 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(parcels.data ?? []).map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-5 py-2.5 font-mono">{r.order_id}</td>
                      <td className="px-5 font-mono text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5"><StatusBadge status={r.parcel_status} /></td>
                      <td className="px-5 text-muted-foreground">{r.reason}</td>
                      <td className="px-5"><Impact value={r.score_impact} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {parcels.isLoading && <div className="px-5 py-4 text-xs text-muted-foreground">Loading…</div>}
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}
