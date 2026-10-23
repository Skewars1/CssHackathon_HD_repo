import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crumbs, Icon, Impact, Panel, RiskBadge } from "@/lib/ui";
import { listAppeals, listPenalized, saveLocalAppeal } from "@/lib/surecod";
import { APPEAL_CATEGORIES, CHECK_TITLES, EVIDENCE_PRESETS } from "@/lib/appeals";
import type { AppealResult, EvidenceId, Verdict } from "@/lib/appeals";
import { submitAppeal } from "@/lib/appeals.functions";

export const Route = createFileRoute("/appeals")({
  head: () => ({
    meta: [
      { title: "AI Buyer Appeals — SureCOD" },
      { name: "description", content: "Contest a penalty with counter-evidence and get an AI adjudication." },
      { property: "og:title", content: "AI Buyer Appeals — SureCOD" },
      { property: "og:description", content: "Contest a penalty with counter-evidence and get an AI adjudication." },
    ],
  }),
  component: Appeals,
});

const VERDICT_STYLE: Record<Verdict, { chip: string; label: string }> = {
  APPROVED: { chip: "bg-trusted/15 text-trusted", label: "Approved" },
  PARTIAL: { chip: "bg-watchlist/15 text-watchlist", label: "Partially approved" },
  REJECTED: { chip: "bg-rto/15 text-rto", label: "Rejected" },
};

function Appeals() {
  const qc = useQueryClient();
  const penalized = useQuery({ queryKey: ["penalized"], queryFn: listPenalized });
  const appeals = useQuery({ queryKey: ["appeals"], queryFn: listAppeals });

  const [orderId, setOrderId] = useState("");
  const [category, setCategory] = useState<string>(APPEAL_CATEGORIES[0]);
  const [explanation, setExplanation] = useState("");
  const [evidence, setEvidence] = useState<EvidenceId>(EVIDENCE_PRESETS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppealResult | null>(null);

  const allAppeals = appeals.data ?? [];
  const appealed = new Set(allAppeals.map((a) => a.order_id));
  const eligible = (penalized.data ?? []).filter((p) => !appealed.has(p.order_id));
  const order = eligible.find((p) => p.order_id === orderId) ?? null;

  const submit = async () => {
    if (!order) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await submitAppeal({ data: { orderId: order.order_id, category: category as (typeof APPEAL_CATEGORIES)[number], explanation, evidence } });
      saveLocalAppeal({
        id: `${order.order_id}-${Date.now()}`,
        order_id: order.order_id,
        account_id: res.accountId,
        category,
        explanation,
        evidence,
        verdict: res.verdict,
        restored_points: res.restoredPoints,
        summary: res.summary,
        created_at: new Date().toISOString(),
        persistedInDb: !!res.persistedInDb,
      });
      setResult(res);
      setOrderId(""); setExplanation("");
      await qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not submit the appeal. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Crumbs items={["Operations", "AI Buyer Appeals"]} />
      <h1 className="font-heading text-2xl font-bold mt-4 mb-5">AI Buyer Appeals</h1>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
        <Panel className="p-5">
          <h2 className="font-heading font-semibold mb-4">File an appeal</h2>

          <label className="block text-xs text-muted-foreground mb-4">Penalized order
            <select value={orderId} onChange={(e) => { setOrderId(e.target.value); setResult(null); setError(null); }}
              className="mt-1 w-full px-3 py-2 rounded border border-border bg-canvas text-sm font-mono text-foreground">
              <option value="">{eligible.length ? "Select an order…" : "No penalized orders to appeal"}</option>
              {eligible.map((p) => <option key={p.order_id} value={p.order_id}>{p.order_id} · {p.account_id} · {p.score_impact} pts</option>)}
            </select>
          </label>

          {order && (
            <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2.5 rounded bg-rto/10 text-sm">
              <span className="text-rto font-semibold">{order.reason}</span>
              <Impact value={order.score_impact} />
            </div>
          )}

          <label className="block text-xs text-muted-foreground mb-4">Reason for appeal
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded border border-border bg-canvas text-sm text-foreground">
              {APPEAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <label className="block text-xs text-muted-foreground mb-4">Note <span className="text-[10px]">({explanation.length}/500)</span>
            <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={500} rows={3}
              className="mt-1 w-full px-3 py-2 rounded border border-border bg-canvas text-sm text-foreground focus:outline-none focus:border-foreground" />
          </label>

          <div className="text-xs text-muted-foreground mb-2">Counter-evidence <span className="text-[10px]">(mocked screenshots)</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            {EVIDENCE_PRESETS.map((e) => (
              <button key={e.id} type="button" onClick={() => setEvidence(e.id)}
                className={`text-left px-3 py-2.5 rounded border transition-colors ${evidence === e.id ? "border-2 border-foreground bg-ivory" : "border-border bg-ivory hover:bg-stone"}`}>
                <Icon name="image" className="text-[18px] text-muted-foreground mb-1" />
                <div className="text-xs font-semibold leading-tight">{e.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{e.detail}</div>
              </button>
            ))}
          </div>

          <button onClick={submit} disabled={!order || busy}
            className="w-full py-3 rounded bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50">
            {busy ? "Reviewing…" : <>Submit for AI review<Icon name="arrow_forward" className="text-[16px]" /></>}
          </button>
          {error && <p className="text-rto text-xs mt-2">{error}</p>}
        </Panel>

        <Panel className="p-5">
          <h2 className="font-heading font-semibold mb-4">AI verdict</h2>

          {busy && (
            <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
              <Icon name="gavel" className="text-[28px] mb-2" /><div>Gemini is reviewing the evidence…</div>
            </div>
          )}

          {!busy && !result && (
            <ol className="space-y-2">
              {CHECK_TITLES.map((t, i) => (
                <li key={t} className="flex items-center gap-3 px-3 py-2.5 rounded bg-stone text-sm text-muted-foreground">
                  <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center font-mono text-[10px]">{i + 1}</span>{t}
                </li>
              ))}
              <li className="text-[11px] text-muted-foreground pt-1">Awaiting submission.</li>
            </ol>
          )}

          {!busy && result && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className={`font-mono text-xs px-2 py-1 rounded font-semibold ${VERDICT_STYLE[result.verdict].chip}`}>{VERDICT_STYLE[result.verdict].label}</span>
                <span className={`font-mono text-sm font-semibold ${result.restoredPoints > 0 ? "text-trusted" : "text-muted-foreground"}`}>
                  {result.restoredPoints > 0 ? `+${result.restoredPoints}` : "0"} pts restored
                </span>
              </div>
              <p className="text-sm mb-4">{result.summary}</p>
              <div className="space-y-1.5 mb-4">
                {result.checks.map((c, i) => (
                  <details key={i} className="group rounded border border-border bg-canvas">
                    <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm list-none">
                      <span>{i + 1}. {c.title}</span>
                      <Icon name="expand_more" className="text-[18px] text-muted-foreground group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-3 pb-3 text-xs text-muted-foreground">{c.finding}</div>
                  </details>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                {result.accountId} · score {result.trustScore} <RiskBadge risk={result.riskFactor} />
              </div>
            </div>
          )}
        </Panel>
      </div>

      {allAppeals.length > 0 && (
        <Panel className="mt-5 overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-heading font-semibold text-sm">Resolved appeals</div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-xs">
            <thead className="bg-stone text-muted-foreground"><tr>
              <th className="text-left px-4 py-2 font-medium">Order</th><th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-left px-4 py-2 font-medium">Verdict</th><th className="text-right px-4 py-2 font-medium">Restored</th>
            </tr></thead>
            <tbody>
              {allAppeals.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono">{a.order_id} · {a.account_id}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${VERDICT_STYLE[a.verdict as Verdict]?.chip ?? "bg-stone"}`}>{a.verdict}</span></td>
                  <td className="px-4 py-2 text-right"><Impact value={a.restored_points} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Panel>
      )}
    </>
  );
}
