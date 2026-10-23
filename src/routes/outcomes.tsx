import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crumbs, Icon, Panel, RiskBadge } from "@/lib/ui";
import { FAILURE_REASONS, SUCCESS_REASONS, listPending, resolveParcel, shortHash } from "@/lib/surecod";

export const Route = createFileRoute("/outcomes")({
  head: () => ({
    meta: [
      { title: "Log Delivery Outcome — SureCOD" },
      { name: "description", content: "Resolve pending parcels and update buyer trust scores." },
      { property: "og:title", content: "Log Delivery Outcome — SureCOD" },
      { property: "og:description", content: "Resolve pending parcels and update buyer trust scores." },
    ],
  }),
  component: Outcomes,
});

function Outcomes() {
  const qc = useQueryClient();
  const pending = useQuery({ queryKey: ["pending"], queryFn: listPending });
  const [sel, setSel] = useState<string | null>(null);
  const [ok, setOk] = useState(true);
  const [reason, setReason] = useState<string>(SUCCESS_REASONS[0].reason);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; risk: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = pending.data ?? [];
  const order = rows.find((r) => r.order_id === sel) ?? null;
  const all = [...SUCCESS_REASONS, ...FAILURE_REASONS];
  const pts = all.find((r) => r.reason === reason)?.pts ?? 0;

  const pickOutcome = (success: boolean) => {
    setOk(success);
    setReason(success ? SUCCESS_REASONS[0].reason : FAILURE_REASONS[0].reason);
  };

  const submit = async () => {
    if (!order) return;
    setBusy(true); setError(null);
    try {
      const prof = await resolveParcel(order.order_id, reason);
      setMsg({ text: `${order.order_id} resolved · ${prof.account_id} score now ${prof.trust_score}`, risk: prof.risk_factor });
      setSel(null);
      await qc.invalidateQueries();
    } catch {
      setError("Could not submit the outcome. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Crumbs items={["Operations", "Log Delivery Outcome"]} />
      <h1 className="font-heading text-2xl font-bold mt-4 mb-5">Log Delivery Outcome</h1>
      {msg && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded bg-trusted/10 text-trusted text-sm font-semibold">
          <Icon name="check_circle" className="text-[18px]" />{msg.text} <RiskBadge risk={msg.risk} />
        </div>
      )}
      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        <Panel className="overflow-hidden h-fit">
          <div className="flex justify-between px-4 py-3 border-b border-border"><h2 className="font-heading font-semibold text-sm">Pending Parcels</h2><span className="font-mono text-[11px] text-muted-foreground">{rows.length} pending</span></div>
          {pending.isLoading && <div className="px-4 py-6 text-xs text-muted-foreground">Loading…</div>}
          {!pending.isLoading && rows.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">No pending parcels. <Link to="/" className="underline">Place an order</Link> to create one.</div>
          )}
          {rows.map((x) => (
            <button key={x.order_id} onClick={() => { setSel(x.order_id); setMsg(null); }}
              className={`w-full text-left px-4 py-3 flex items-center justify-between font-mono text-xs border-l-4 border-b border-b-border ${sel === x.order_id ? "bg-stone border-l-trusted font-semibold" : "border-l-transparent text-muted-foreground hover:bg-stone/50"}`}>
              <span className="flex flex-col"><span>{x.order_id} · {x.account_id}</span><span className="text-[10px] text-muted-foreground">{new Date(x.created_at).toLocaleString()}</span></span>
              <Icon name="chevron_right" className="text-[16px]" />
            </button>
          ))}
        </Panel>

        <Panel className="p-5">
          {!order ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Select a pending parcel to log its outcome.</div>
          ) : (
            <>
              <div className="mb-5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Verification</div>
                <div className="font-heading font-semibold">{order.order_id} · {order.account_id}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{shortHash(order.phone_hash)}</div>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Final Status</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => pickOutcome(true)} className={`py-3 rounded border-2 font-semibold text-sm ${ok ? "border-trusted bg-trusted/10 text-trusted" : "border-border"}`}>✓ Confirmed Received</button>
                <button onClick={() => pickOutcome(false)} className={`py-3 rounded border-2 font-semibold text-sm ${!ok ? "border-rto bg-rto/10 text-rto" : "border-border"}`}>✕ Missed / Returned (RTO)</button>
              </div>
              <label className="block text-xs text-muted-foreground mb-4">Reason
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full px-3 py-2 rounded border border-border bg-canvas text-sm text-foreground">
                  {ok
                    ? SUCCESS_REASONS.map((r) => <option key={r.reason} value={r.reason}>{r.reason} (+{r.pts} pts)</option>)
                    : ["Mild Impact", "Moderate Impact", "Severe Impact"].map((g) => (
                        <optgroup key={g} label={g}>
                          {FAILURE_REASONS.filter((r) => r.group === g).map((r) => <option key={r.reason} value={r.reason}>{r.reason} ({r.pts} pts)</option>)}
                        </optgroup>
                      ))}
                </select>
              </label>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded bg-stone font-mono text-sm mb-5 ${pts >= 0 ? "text-trusted" : "text-rto"}`}>
                <Icon name={pts >= 0 ? "trending_up" : "trending_down"} className="text-[18px]" />Score Impact: {pts > 0 ? "+" : ""}{pts} pts
              </div>
              <button onClick={submit} disabled={busy} className="w-full py-3 rounded bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50">
                {busy ? "Submitting…" : <>Submit Outcome<Icon name="arrow_forward" className="text-[16px]" /></>}
              </button>
              {error && <p className="text-rto text-xs mt-2">{error}</p>}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
