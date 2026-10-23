import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crumbs, Icon, Impact, Panel, RiskBadge, ScoreScaleBar, StatusBadge, riskStyle } from "@/lib/ui";
import { getPaymentEligibility, listParcels, listProfiles, shortHash } from "@/lib/surecod";
import type { AppealReviewRecord } from "@/lib/surecod";
import { EVIDENCE_PRESETS } from "@/lib/appeals";

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
  const [tierFilter, setTierFilter] = useState<string>("All");
  const [sel, setSel] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<AppealReviewRecord | null>(null);

  const profiles = useQuery({ queryKey: ["profiles", q], queryFn: () => listProfiles(q) });
  const rawList = profiles.data ?? [];
  const list = rawList.filter((x) => (tierFilter === "All" ? true : x.risk_factor === tierFilter));

  const p = rawList.find((x) => x.account_id === sel) ?? list[0] ?? null;
  const activeId = p?.account_id ?? null;
  const parcels = useQuery({
    queryKey: ["parcels", activeId],
    queryFn: () => listParcels(activeId!),
    enabled: !!activeId,
  });

  const elig = p ? getPaymentEligibility(p.trust_score) : null;
  const evidenceInfo = activeReport
    ? EVIDENCE_PRESETS.find((e) => e.id === activeReport.evidence)
    : null;

  return (
    <div className="space-y-5">
      <Crumbs items={["SureCOD", "Risk Engine", "Seller Risk Lookup"]} tag="0–100 Ledger" />

      <div className="navy-hero-banner rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="font-heading text-2xl font-bold">Seller Risk Lookup &amp; Buyer Ledger</h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-0.5">
            Inspect anonymized buyer trust scores (0–100 scale, starting at 50), payment eligibility, and click any
            past AI Review Report to inspect its full findings.
          </p>
        </div>

        <div className="relative flex items-center w-full sm:w-80">
          <Icon name="search" className="absolute left-3.5 text-blue-200 text-[16px]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ACC-XXXX or sha256…"
            className="w-full pl-9 pr-3.5 py-2 bg-white/12 border border-white/20 rounded-xl font-mono text-xs text-white placeholder:text-blue-200/70 focus:outline-none focus:bg-white/20"
          />
        </div>
      </div>

      {/* Tier Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["All", `All Profiles (${rawList.length})`],
            ["Trusted", "Trusted (≥70)"],
            ["Neutral", "Neutral (35–69)"],
            ["Watchlist", "Watchlist (<35)"],
            ["High Risk", "High Risk (≤20)"],
          ] as const
        ).map(([tier, label]) => (
          <button
            key={tier}
            type="button"
            onClick={() => setTierFilter(tier)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              tierFilter === tier
                ? "bg-primary text-white shadow-sm"
                : "bg-ivory border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <Panel className="overflow-hidden h-fit" interactive>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-stone/50">
            <h2 className="font-heading font-bold text-sm flex items-center gap-2">
              <Icon name="group" className="text-[18px] text-primary" />
              <span>Buyer Profiles</span>
            </h2>
            <span className="font-mono text-[11px] text-muted-foreground font-semibold">
              {list.length} shown
            </span>
          </div>

          {profiles.isLoading && <div className="px-5 py-6 text-xs text-muted-foreground">Loading…</div>}
          {!profiles.isLoading && list.length === 0 && (
            <div className="px-5 py-8 text-center text-xs text-muted-foreground">
              {q || tierFilter !== "All"
                ? "No matching buyer profiles."
                : "No buyer profiles yet. They appear automatically after checkout."}
            </div>
          )}

          <div className="divide-y divide-border/70 max-h-[560px] overflow-y-auto">
            {list.map((x) => {
              const isSelected = activeId === x.account_id;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setSel(x.account_id);
                    setActiveReport(null);
                  }}
                  className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-2 border-l-4 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-l-primary"
                      : "border-l-transparent hover-row-highlight"
                  }`}
                >
                  <span className="flex flex-col font-mono text-xs">
                    <span className="font-bold text-foreground">{x.account_id}</span>
                    <span className="text-[10px] text-muted-foreground">{shortHash(x.phone_hash)}</span>
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {x.trust_score}
                      <span className="text-[10px] text-muted-foreground font-normal">/100</span>
                    </span>
                    <RiskBadge risk={x.risk_factor} />
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {!p ? (
          <Panel className="py-20 text-center text-sm text-muted-foreground">
            Select a buyer profile to view their 0–100 trust gauge and delivery history.
          </Panel>
        ) : (
          <div className="space-y-5">
            <Panel className="p-6" interactive>
              <div className="flex flex-wrap items-center justify-between gap-6 mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-navy to-primary text-white flex flex-col items-center justify-center shadow-lg shadow-primary/25">
                    <span className="font-heading text-3xl font-bold leading-none">{p.trust_score}</span>
                    <span className="font-mono text-[10px] text-sky-200 mt-1">/ 100 PTS</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-xl font-bold text-foreground">{p.account_id}</span>
                      <RiskBadge risk={p.risk_factor} />
                    </div>
                    <div className="font-mono text-xs text-muted-foreground break-all mt-1 flex items-center gap-1">
                      <Icon name="lock" className="text-[13px] text-trusted" />
                      <span>sha256_{p.phone_hash}</span>
                    </div>
                    <div className={`text-xs font-semibold mt-1.5 ${riskStyle(p.risk_factor).text}`}>
                      {elig?.standardCodAllowed
                        ? "✓ Eligible for Standard COD, Protected COD & Full Upfront"
                        : elig?.protectedCodAllowed
                          ? "⚡ Standard COD Locked · Must use Protected COD (₱80 deposit) or Full Upfront"
                          : "⛔ High Risk Restriction (≤20) · Only Full Upfront Payment Remaining"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 font-mono text-center">
                  {(
                    [
                      [p.confirmed_deliveries, "Successful", "text-trusted bg-trusted/10 border-trusted/25"],
                      [p.missed_returned_count, "Unsuccessful", "text-rto bg-rto/10 border-rto/25"],
                      [p.pending_count, "Pending", "text-primary bg-primary/10 border-primary/25"],
                    ] as const
                  ).map(([n, l, cls]) => (
                    <div key={l} className={`px-4 py-2.5 rounded-2xl border ${cls}`}>
                      <div className="text-2xl font-bold">{n}</div>
                      <div className="text-[10px] uppercase font-semibold">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <ScoreScaleBar score={p.trust_score} />
            </Panel>

            {/* Expandable Past AI Review Report Viewer when clicked */}
            {activeReport && (
              <Panel className="p-6 border-2 border-primary/40 bg-gradient-to-br from-blue-600/5 to-sky-500/5" interactive>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">
                      <Icon name="assignment" className="text-[18px]" />
                    </span>
                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground">
                        AI Review Report · {activeReport.order_id}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {activeReport.account_id} · {new Date(activeReport.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status="Sent for Moderation" />
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="px-2.5 py-1 rounded-lg bg-stone hover:bg-border text-xs font-semibold cursor-pointer"
                    >
                      Close ✕
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs mb-3">
                  <div className="p-3 rounded-xl bg-ivory border border-border">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                      Category &amp; Evidence
                    </div>
                    <div className="font-semibold text-foreground">{activeReport.category}</div>
                    <div className="font-mono text-[11px] text-primary mt-0.5">
                      Evidence: {evidenceInfo ? `${evidenceInfo.label} (${evidenceInfo.detail})` : activeReport.evidence}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-ivory border border-border">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                      Buyer Note
                    </div>
                    <div className="italic text-foreground">
                      {activeReport.explanation
                        ? `"${activeReport.explanation}"`
                        : "(No written explanation provided)"}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-ivory border border-primary/25 text-xs mb-3">
                  <div className="text-[10px] font-bold uppercase text-primary mb-1">
                    AI Summary for Human Moderator (Recommendation: {activeReport.verdict})
                  </div>
                  <p className="text-foreground leading-relaxed">{activeReport.summary}</p>
                </div>

                <div className="space-y-1.5">
                  {activeReport.checks.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-ivory border border-border text-xs">
                      <div className="font-bold text-foreground">
                        {idx + 1}. {c.title}
                      </div>
                      <div className="text-muted-foreground mt-0.5">{c.finding}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel className="overflow-hidden" interactive>
              <div className="px-6 py-4 border-b border-border bg-stone/50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading font-bold text-sm flex items-center gap-2">
                    <Icon name="receipt_long" className="text-[18px] text-primary" />
                    <span>Transaction &amp; AI Review History</span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Click any row with an AI Review badge to re-open the full AI Review Report
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {(parcels.data ?? []).length} entries
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-xs">
                  <thead className="bg-stone/80 text-muted-foreground text-[10px] uppercase tracking-wider">
                    <tr>
                      {["Order ID", "Date", "Status", "Reason / AI Review", "Score Impact"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {(parcels.data ?? []).map((r) => {
                      const hasReview = !!r.appealReview;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => hasReview && setActiveReport(r.appealReview!)}
                          className={`transition-colors ${
                            hasReview
                              ? "cursor-pointer hover:bg-primary/10"
                              : "hover:bg-primary/5"
                          }`}
                        >
                          <td className="px-5 py-3 font-mono font-bold text-foreground">{r.order_id}</td>
                          <td className="px-5 py-3 font-mono text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={r.parcel_status} />
                          </td>
                          <td className="px-5 py-3 text-foreground font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{r.reason}</span>
                              {hasReview && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReport(r.appealReview!);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-mono text-[10px] font-bold hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                >
                                  View AI Review Report →
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {r.parcel_status === "Sent for Moderation" ? (
                              <span className="font-mono text-[11px] text-primary font-semibold">
                                Pending Moderator (0 pts)
                              </span>
                            ) : (
                              <Impact value={r.score_impact} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parcels.isLoading && (
                <div className="px-5 py-6 text-xs text-muted-foreground">Loading ledger…</div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
