import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crumbs, Icon, Panel, RiskBadge, ScoreScaleBar } from "@/lib/ui";
import { FAILURE_REASONS, SUCCESS_REASONS, listPending, listProfiles, resolveParcel, shortHash } from "@/lib/surecod";

export const Route = createFileRoute("/outcomes")({
  head: () => ({
    meta: [
      { title: "Log Delivery Outcome — SureCOD" },
      { name: "description", content: "Resolve pending parcels and update buyer 0–100 trust scores." },
      { property: "og:title", content: "Log Delivery Outcome — SureCOD" },
      { property: "og:description", content: "Resolve pending parcels and update buyer 0–100 trust scores." },
    ],
  }),
  component: Outcomes,
});

function Outcomes() {
  const qc = useQueryClient();
  const pending = useQuery({ queryKey: ["pending"], queryFn: listPending });
  const profiles = useQuery({ queryKey: ["profiles", ""], queryFn: () => listProfiles("") });
  const [sel, setSel] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [reason, setReason] = useState<string>(SUCCESS_REASONS[0].reason);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; risk: string; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = pending.data ?? [];
  const order = rows.find((r) => r.order_id === sel) ?? null;
  const buyerProfile = order
    ? (profiles.data ?? []).find((p) => p.account_id === order.account_id)
    : null;
  const currentScore = buyerProfile?.trust_score ?? 50;

  const all = [...SUCCESS_REASONS, ...FAILURE_REASONS];
  const pts = all.find((r) => r.reason === reason)?.pts ?? 0;
  const projectedScore = Math.max(0, Math.min(100, currentScore + pts));

  const pickOutcome = (success: boolean) => {
    setOk(success);
    setReason(success ? SUCCESS_REASONS[0].reason : FAILURE_REASONS[0].reason);
  };

  const submit = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const prof = await resolveParcel(order.order_id, reason);
      setMsg({
        text: `${order.order_id} resolved · ${prof.account_id} score updated to ${prof.trust_score}/100`,
        risk: prof.risk_factor,
        score: prof.trust_score,
      });
      setSel(null);
      await qc.invalidateQueries();
    } catch {
      setError("Could not submit the outcome. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Crumbs items={["SureCOD", "Operations", "Log Delivery Outcome"]} tag={`${rows.length} Pending`} />

      <div className="navy-hero-banner rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="font-heading text-2xl font-bold">Log Delivery Outcome</h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-0.5">
            Verify courier handoffs and update the buyer&apos;s 0–100 trust score in real time.
          </p>
        </div>
        <Link
          to="/checkout"
          className="px-3.5 py-2 rounded-xl bg-white/12 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
        >
          <Icon name="add_shopping_cart" className="text-[15px] text-sky-300" />
          <span>Create Test Parcel</span>
        </Link>
      </div>

      {msg && (
        <div className="rounded-2xl bg-trusted/12 border border-trusted/30 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-trusted font-bold text-sm">
            <Icon name="check_circle" className="text-[20px]" />
            <span>{msg.text}</span>
            <RiskBadge risk={msg.risk} />
          </div>
          <Link to="/risk" className="text-xs font-semibold text-primary underline">
            Inspect Buyer Ledger →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <Panel className="overflow-hidden h-fit" interactive>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-stone/50">
            <h2 className="font-heading font-bold text-sm flex items-center gap-2">
              <Icon name="inventory_2" className="text-[18px] text-primary" />
              <span>Pending Parcels</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/12 text-primary font-mono text-[11px] font-bold">
              {rows.length} active
            </span>
          </div>

          {pending.isLoading && <div className="px-5 py-6 text-xs text-muted-foreground">Loading…</div>}
          {!pending.isLoading && rows.length === 0 && (
            <div className="px-5 py-10 text-center text-xs text-muted-foreground space-y-2">
              <Icon name="task_alt" className="text-[28px] text-trusted" />
              <div>All dispatched parcels have been resolved!</div>
              <Link to="/checkout" className="inline-block text-primary font-semibold underline">
                Place a new order in Checkout →
              </Link>
            </div>
          )}

          <div className="divide-y divide-border/70">
            {rows.map((x) => {
              const isSelected = sel === x.order_id;
              return (
                <button
                  key={x.order_id}
                  type="button"
                  onClick={() => {
                    setSel(x.order_id);
                    setMsg(null);
                  }}
                  className={`w-full text-left px-5 py-3.5 flex items-center justify-between font-mono text-xs border-l-4 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-l-primary font-bold text-foreground"
                      : "border-l-transparent text-muted-foreground hover-row-highlight"
                  }`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-foreground font-bold">
                      {x.order_id} · <span className="text-primary">{x.account_id}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(x.created_at).toLocaleString()}
                    </span>
                  </span>
                  <Icon
                    name="chevron_right"
                    className={`text-[18px] ${isSelected ? "text-primary" : ""}`}
                  />
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-6" interactive>
          {!order ? (
            <div className="py-16 text-center text-sm text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                <Icon name="fact_check" className="text-[24px]" />
              </div>
              <div className="font-heading font-bold text-base text-foreground">
                Select a Pending Parcel
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Choose an active order on the left to record whether delivery succeeded or was returned to
                origin.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 p-4 rounded-2xl bg-stone/70 border border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Active Parcel Verification
                  </div>
                  <div className="font-heading text-lg font-bold">
                    {order.order_id} · <span className="text-primary">{order.account_id}</span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {shortHash(order.phone_hash)}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-[10px] uppercase text-muted-foreground">Current → Projected</div>
                  <div className="text-base font-bold">
                    {currentScore} →{" "}
                    <span className={pts >= 0 ? "text-trusted" : "text-rto"}>{projectedScore} / 100</span>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <ScoreScaleBar score={projectedScore} />
              </div>

              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                Final Courier Status
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => pickOutcome(true)}
                  className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    ok
                      ? "border-trusted bg-trusted/12 text-trusted shadow-sm"
                      : "border-border bg-ivory hover:border-trusted/40"
                  }`}
                >
                  <Icon name="check_circle" className="text-[18px]" />
                  <span>Confirmed Received</span>
                </button>
                <button
                  type="button"
                  onClick={() => pickOutcome(false)}
                  className={`py-3.5 px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !ok
                      ? "border-rto bg-rto/12 text-rto shadow-sm"
                      : "border-border bg-ivory hover:border-rto/40"
                  }`}
                >
                  <Icon name="cancel" className="text-[18px]" />
                  <span>Missed / Returned (RTO)</span>
                </button>
              </div>

              <label className="block text-xs font-semibold text-foreground mb-4">
                Outcome Reason &amp; Severity Weight
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {ok
                    ? SUCCESS_REASONS.map((r) => (
                        <option key={r.reason} value={r.reason}>
                          {r.reason} (+{r.pts} pts)
                        </option>
                      ))
                    : ["Mild Impact", "Moderate Impact", "Severe Impact"].map((g) => (
                        <optgroup key={g} label={g}>
                          {FAILURE_REASONS.filter((r) => r.group === g).map((r) => (
                            <option key={r.reason} value={r.reason}>
                              {r.reason} ({r.pts} pts)
                            </option>
                          ))}
                        </optgroup>
                      ))}
                </select>
              </label>

              <div
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-mono text-sm mb-5 border ${
                  pts >= 0
                    ? "bg-trusted/10 border-trusted/30 text-trusted"
                    : "bg-rto/10 border-rto/30 text-rto"
                }`}
              >
                <span className="flex items-center gap-2 font-bold">
                  <Icon name={pts >= 0 ? "trending_up" : "trending_down"} className="text-[20px]" />
                  <span>
                    Score Impact: {pts > 0 ? "+" : ""}
                    {pts} pts
                  </span>
                </span>
                <span className="text-xs">
                  New Score: <strong>{projectedScore}/100</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="hover-glow-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {busy ? (
                  "Submitting Outcome…"
                ) : (
                  <>
                    <span>Submit Delivery Outcome</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </>
                )}
              </button>
              {error && <p className="text-rto text-xs mt-2">{error}</p>}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
