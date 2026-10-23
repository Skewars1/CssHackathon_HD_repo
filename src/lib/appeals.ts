// Client-safe AI Review constants. The evidence is mocked: each preset carries the
// metadata signals a real screenshot analysis would produce, and the AI reviews them
// to prepare a structured report for human moderation (without automatically changing points).

export const APPEAL_CATEGORIES = [
  "Courier Fault: Rider never called or texted",
  "Courier Fault: Marked refused without a delivery attempt",
  "Buyer Emergency: Unforeseen medical or family emergency",
  "Address Issue: Pin was accurate, rider went to the wrong street",
] as const;

export const EVIDENCE_PRESETS = [
  {
    id: "valid_call_log",
    label: "Valid call log",
    detail: "0 missed calls from courier",
    signals: {
      exif_metadata: "intact",
      edit_traces: "none detected",
      timestamp_vs_delivery_window: "matches the attempted delivery window",
      content: "phone call log shows zero missed calls or SMS from the courier number on delivery day",
    },
  },
  {
    id: "blurry_tampered",
    label: "Blurry screenshot",
    detail: "Failed tamper check",
    signals: {
      exif_metadata: "stripped",
      edit_traces: "layer artifacts and inconsistent fonts detected",
      timestamp_vs_delivery_window: "cannot be verified",
      content: "low resolution, call entries are partially unreadable",
    },
  },
  {
    id: "ambiguous_sms",
    label: "Ambiguous SMS thread",
    detail: "Inconclusive timestamps",
    signals: {
      exif_metadata: "intact",
      edit_traces: "none detected",
      timestamp_vs_delivery_window: "partially overlaps the delivery window",
      content: "SMS thread has no courier number or tracking reference, so it cannot be tied to this parcel",
    },
  },
] as const;

export type EvidenceId = (typeof EVIDENCE_PRESETS)[number]["id"];
export const EVIDENCE_IDS = EVIDENCE_PRESETS.map((e) => e.id) as [EvidenceId, ...EvidenceId[]];

export type Verdict = "APPROVED" | "PARTIAL" | "REJECTED";

export type AppealCheck = { title: string; finding: string };

export type AppealResult = {
  id?: string;
  orderId?: string;
  category?: string;
  explanation?: string;
  evidence?: string;
  createdAt?: string;
  verdict: Verdict;
  restoredPoints: number;
  summary: string;
  checks: AppealCheck[];
  accountId: string;
  trustScore: number;
  riskFactor: string;
  persistedInDb?: boolean;
};

export const CHECK_TITLES = [
  "Screenshot Metadata & Tamper Check",
  "Courier Call-Attempt Cross-Reference",
  "Human Moderation Recommendation",
] as const;

/** AI Review no longer automatically adds or removes points; human moderators make the final score decision. */
export function restoredFor(_verdict: Verdict, _deducted: number): number {
  return 0;
}
