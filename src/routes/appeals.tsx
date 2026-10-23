import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crumbs, Icon, Impact, Panel, StatusBadge } from "@/lib/ui";
import { listAppeals, listPenalized, saveLocalAppeal } from "@/lib/surecod";
import type { AppealReviewRecord } from "@/lib/surecod";
import { APPEAL_CATEGORIES, CHECK_TITLES, EVIDENCE_PRESETS } from "@/lib/appeals";
import type { EvidenceId, Verdict } from "@/lib/appeals";
import { submitAppeal } from "@/lib/appeals.functions";

export const Route = createFileRoute("/appeals")({
  head: () => ({
    meta: [
      { title: "AI Review — SureCOD" },
      {
        name: "description",
        content: "AI pre-screening review of buyer evidence and notes before forwarding to human moderation.",
      },
      { property: "og:title", content: "AI Review — SureCOD" },
      {
        property: "og:description",
        content: "AI pre-screening review of buyer evidence and notes before forwarding to human moderation.",
      },
    ],
  }),
  component: Appeals,
});

const VERDICT_STYLE: Record<Verdict, { chip: string; label: string }> = {
  APPROVED: {
    chip: "bg-trusted/15 text-trusted border border-trusted/30",
    label: "AI Recommendation: Favorable Evidence",
  },
  PARTIAL: {
    chip: "bg-watchlist/15 text-watchlist border border-watchlist/30",
    label: "AI Recommendation: Needs Closer Check",
  },
  REJECTED: {
    chip: "bg-rto/15 text-rto border border-rto/30",
    label: "AI Recommendation: Weak / Flagged Evidence",
  },
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
  const [selectedReport, setSelectedReport] = useState<AppealReviewRecord | null>(null);

  const allAppeals = appeals.data ?? [];
  const appealed = new Set(allAppeals.map((a) => a.order_id));
  const eligible = (penalized.data ?? []).filter((p) => !appealed.has(p.order_id));
  const order = eligible.find((p) => p.order_id === orderId) ?? null;

  const submit = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitAppeal({
        data: {
          orderId: order.order_id,
          category: category as (typeof APPEAL_CATEGORIES)[number],
          explanation,
          evidence,
        },
      });
      const record: AppealReviewRecord = {
        id: `${order.order_id}-${Date.now()}`,
        order_id: order.order_id,
        account_id: res.accountId,
        category,
        explanation,
        evidence,
        verdict: res.verdict,
        restored_points: 0,
        summary: res.summary,
        checks: res.checks,
        created_at: res.createdAt ?? new Date().toISOString(),
        persistedInDb: !!res.persistedInDb,
      };
      saveLocalAppeal(record);
      setSelectedReport(record);
      setOrderId("");
      setExplanation("");
      await qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Could not generate the AI review. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const evidenceInfo = selectedReport
    ? EVIDENCE_PRESETS.find((e) => e.id === selectedReport.evidence)
    : null;

  return (
    <div className="space-y-5">
      <Crumbs items={["SureCOD", "Operations", "AI Review"]} tag="Human Moderation Pre-Screen" />

      <div className="navy-hero-banner rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="font-heading text-2xl font-bold">AI Evidence Review &amp; Human Moderation</h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-0.5">
            Gemini analyzes buyer notes and screenshot evidence to generate an advisory report, then forwards the
            case for human moderation without automatically adding or removing points.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs bg-white/10 border border-white/20 px-3.5 py-2 rounded-xl text-sky-200">
          <Icon name="support_agent" className="text-[16px] text-sky-300" />
          <span>{allAppeals.length} Reports in Moderation Queue</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* Left: Submit Evidence & Notes for AI Review */}
        <Panel className="p-6" interactive>
          <h2 className="font-heading font-bold text-lg mb-1 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
              <Icon name="rate_review" className="text-[18px]" />
            </span>
            <span>Submit Case for AI Review</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Points are not altered automatically — AI prepares a pre-screening report and sends it to a human
            moderator.
          </p>

          <label className="block text-xs font-semibold text-foreground mb-4">
            Penalized Order (Missed / Returned)
            <select
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                setError(null);
              }}
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-sm font-mono text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">
                {eligible.length ? "Select a penalized order…" : "No penalized orders awaiting AI review"}
              </option>
              {eligible.map((p) => (
                <option key={p.order_id} value={p.order_id}>
                  {p.order_id} · {p.account_id} · {p.score_impact} pts
                </option>
              ))}
            </select>
          </label>

          {order && (
            <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-rto/10 border border-rto/30 text-sm">
              <span className="text-rto font-bold text-xs">{order.reason}</span>
              <Impact value={order.score_impact} />
            </div>
          )}

          <label className="block text-xs font-semibold text-foreground mb-4">
            Dispute Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {APPEAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-foreground mb-4">
            Buyer Note &amp; Context{" "}
            <span className="text-[10px] text-muted-foreground">({explanation.length}/500)</span>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Describe what happened during the delivery attempt for the AI & human moderator…"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </label>

          <div className="text-xs font-semibold text-foreground mb-2">
            Attached Evidence{" "}
            <span className="text-[10px] text-muted-foreground">(Simulated Screenshot Signals)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
            {EVIDENCE_PRESETS.map((e) => {
              const isSelected = evidence === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEvidence(e.id)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-2 border-primary bg-primary/8 shadow-sm -translate-y-0.5"
                      : "border-border bg-ivory hover-row-highlight"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                      isSelected ? "bg-primary text-white" : "bg-stone text-primary"
                    }`}
                  >
                    <Icon name="image" className="text-[16px]" />
                  </div>
                  <div className="text-xs font-bold leading-tight text-foreground">{e.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{e.detail}</div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!order || busy}
            className="hover-glow-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {busy ? (
              <>
                <Icon name="progress_activity" className="text-[18px] animate-spin" />
                <span>Generating AI Review &amp; Forwarding…</span>
              </>
            ) : (
              <>
                <span>Run AI Review &amp; Send for Human Moderation</span>
                <Icon name="send" className="text-[16px]" />
              </>
            )}
          </button>
          {error && <p className="text-rto text-xs mt-2 font-medium">{error}</p>}
        </Panel>

        {/* Right: Active / Selected AI Review Report */}
        <Panel className="p-6" interactive>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-heading font-bold text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center">
                <Icon name="assignment" className="text-[18px]" />
              </span>
              <span>AI Review Report</span>
            </h2>
            {selectedReport && (
              <StatusBadge status="Sent for Moderation" />
            )}
          </div>

          {busy && (
            <div className="py-16 text-center text-sm text-muted-foreground animate-pulse space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto">
                <Icon name="psychology" className="text-[28px]" />
              </div>
              <div className="font-bold text-foreground">
                Gemini is reviewing the evidence &amp; buyer notes…
              </div>
              <div className="text-xs">Preparing pre-screening dossier for human moderation</div>
            </div>
          )}

          {!busy && !selectedReport && (
            <div className="space-y-3">
              <ol className="space-y-2.5">
                {CHECK_TITLES.map((t, i) => (
                  <li
                    key={t}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone/70 border border-border/70 text-sm text-muted-foreground"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center font-mono text-xs">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground">{t}</span>
                  </li>
                ))}
              </ol>
              <div className="p-4 rounded-xl bg-primary/8 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
                <Icon name="info" className="text-[16px] text-primary mt-0.5 shrink-0" />
                <span>
                  Submit a penalized order on the left — or{" "}
                  <strong className="text-foreground">click any past AI review report below</strong> — to inspect
                  its full evidence review and moderation notes.
                </span>
              </div>
            </div>
          )}

          {!busy && selectedReport && (
            <div className="space-y-4">
              {/* Header Info Banner */}
              <div className="p-4 rounded-2xl bg-stone/80 border border-border space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {selectedReport.order_id} ·{" "}
                    <span className="text-primary">{selectedReport.account_id}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span
                    className={`font-mono text-[11px] px-3 py-1 rounded-full font-bold ${
                      VERDICT_STYLE[selectedReport.verdict]?.chip ?? "bg-stone"
                    }`}
                  >
                    {VERDICT_STYLE[selectedReport.verdict]?.label ?? selectedReport.verdict}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                    0 pts auto-applied · Awaiting Moderator
                  </span>
                </div>
              </div>

              {/* Submitted Evidence & Buyer Note */}
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-canvas border border-border">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Dispute Category &amp; Evidence
                  </div>
                  <div className="font-semibold text-foreground">{selectedReport.category}</div>
                  <div className="text-primary font-mono text-[11px] mt-1">
                    Attachment: {evidenceInfo ? `${evidenceInfo.label} (${evidenceInfo.detail})` : selectedReport.evidence}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-canvas border border-border">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Buyer Note Reviewed
                  </div>
                  <div className="text-foreground italic">
                    {selectedReport.explanation
                      ? `"${selectedReport.explanation}"`
                      : "(No written explanation provided by buyer)"}
                  </div>
                </div>
              </div>

              {/* AI Executive Summary */}
              <div className="p-4 rounded-xl bg-ivory border border-primary/25 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                  <Icon name="auto_awesome" className="text-[14px]" />
                  <span>AI Review Summary for Human Moderator</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{selectedReport.summary}</p>
              </div>

              {/* 3 Detailed Forensic Checks */}
              <div className="space-y-2">
                {selectedReport.checks.map((c, i) => (
                  <details
                    key={i}
                    open
                    className="group rounded-xl border border-border bg-canvas overflow-hidden"
                  >
                    <summary className="flex items-center justify-between cursor-pointer px-4 py-2.5 text-xs font-bold text-foreground list-none">
                      <span>
                        {i + 1}. {c.title}
                      </span>
                      <Icon
                        name="expand_more"
                        className="text-[18px] text-primary group-open:rotate-180 transition-transform"
                      />
                    </summary>
                    <div className="px-4 pb-3 text-xs text-muted-foreground">{c.finding}</div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Past AI Review Reports List (Clickable to Re-Open Report!) */}
      <Panel className="overflow-hidden" interactive>
        <div className="px-6 py-4 border-b border-border bg-stone/50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading font-bold text-sm flex items-center gap-2">
              <Icon name="folder_managed" className="text-[18px] text-primary" />
              <span>Past AI Review Reports (Click any row to view full report)</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Click any profile&apos;s past AI review below to re-open its evidence analysis and moderator summary
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {allAppeals.length} saved reports
          </span>
        </div>

        {allAppeals.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No AI review reports have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead className="bg-stone/80 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-bold">Order &amp; Profile</th>
                  <th className="text-left px-5 py-3 font-bold">Dispute Category</th>
                  <th className="text-left px-5 py-3 font-bold">Date</th>
                  <th className="text-left px-5 py-3 font-bold">AI Recommendation</th>
                  <th className="text-left px-5 py-3 font-bold">Moderation Status</th>
                  <th className="text-right px-5 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {allAppeals.map((a) => {
                  const isSelected = selectedReport?.order_id === a.order_id;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedReport(a)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/12" : "hover:bg-primary/6"
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                        {a.order_id} · <span className="text-primary">{a.account_id}</span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{a.category}</td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            VERDICT_STYLE[a.verdict as Verdict]?.chip ?? "bg-stone"
                          }`}
                        >
                          {a.verdict}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status="Sent for Moderation" />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(a);
                          }}
                          className={`px-3 py-1 rounded-lg font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-primary/12 text-primary hover:bg-primary hover:text-white"
                          }`}
                        >
                          {isSelected ? "Viewing Report" : "View AI Report →"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
