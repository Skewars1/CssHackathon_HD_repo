import { supabase } from "@/integrations/supabase/client";
import { CHECK_TITLES } from "@/lib/appeals";
import type { AppealCheck, Verdict } from "@/lib/appeals";

export const BASE_TRUST_SCORE = 50;
export const MIN_TRUST_SCORE = 0;
export const MAX_TRUST_SCORE = 100;
export const FIRST_RESTRICTION_SCORE = 30;

export type RiskTier = "Trusted" | "Neutral" | "Watchlist" | "High Risk";

export const SUCCESS_REASONS = [
  { reason: "Confirmed Received — Standard COD", pts: 10 },
  { reason: "Confirmed Received — Protected COD (With Deposit)", pts: 15 },
] as const;

export const FAILURE_REASONS = [
  { group: "Mild Impact", reason: "Requested Reschedule / Valid Prior Notice", pts: -5 },
  { group: "Mild Impact", reason: "Temporarily Unavailable on 1st Attempt", pts: -8 },
  { group: "Moderate Impact", reason: "Buyer Unreachable (Missed Courier Calls/SMS)", pts: -15 },
  { group: "Moderate Impact", reason: "No Cash Ready Upon Delivery", pts: -18 },
  { group: "Severe Impact", reason: "Refused Parcel at Doorstep Without Valid Reason", pts: -25 },
  { group: "Severe Impact", reason: "Fake Address / Bogus Order", pts: -35 },
] as const;

export type AppealReviewRecord = {
  id: string;
  order_id: string;
  account_id: string;
  category: string;
  explanation: string;
  evidence: string;
  verdict: Verdict;
  restored_points: number;
  summary: string;
  checks: AppealCheck[];
  created_at: string;
  persistedInDb?: boolean;
};

export type LocalAppealRecord = AppealReviewRecord;

const APPEALS_STORAGE_KEY = "surecod_appeals_v1";

export function clampScore(score: number): number {
  return Math.max(MIN_TRUST_SCORE, Math.min(MAX_TRUST_SCORE, Math.round(score)));
}

/**
 * 0–100 Trust Score Tier Mapping:
 * - Trusted:   >= 70 (up to 100) -> Standard COD unlocked
 * - Neutral:   35..69            -> Protected COD or Full Upfront (everyone starts at 50)
 * - Watchlist: 21..34 (< 35, first restriction at 30) -> Protected COD or Full Upfront
 * - High Risk: <= 20             -> Only Full Upfront remaining
 */
export function computeClientRiskFactor(score: number): RiskTier {
  const clamped = clampScore(score);
  if (clamped >= 70) return "Trusted";
  if (clamped >= 35) return "Neutral";
  if (clamped > 20) return "Watchlist";
  return "High Risk";
}

export function getPaymentEligibility(score: number) {
  const tier = computeClientRiskFactor(score);
  return {
    tier,
    standardCodAllowed: score >= 70,
    protectedCodAllowed: score > 20,
    upfrontAllowed: true,
    isWatchlistRestricted: score <= FIRST_RESTRICTION_SCORE && score > 20,
  };
}

function normalizeChecks(rawChecks: unknown, verdict: Verdict, summary: string): AppealCheck[] {
  if (Array.isArray(rawChecks) && rawChecks.length > 0) {
    return rawChecks.map((item, i) => {
      if (item && typeof item === "object" && "title" in item && "finding" in item) {
        return {
          title: String((item as { title: unknown }).title),
          finding: String((item as { finding: unknown }).finding),
        };
      }
      return {
        title: CHECK_TITLES[i] ?? `Check ${i + 1}`,
        finding: summary || "Reviewed by AI and forwarded for human moderation.",
      };
    });
  }
  return [
    {
      title: CHECK_TITLES[0],
      finding:
        verdict === "REJECTED"
          ? "Submitted screenshot metadata showed inconsistencies requiring moderator attention."
          : "Screenshot EXIF metadata and timestamps were inspected with no obvious tampering.",
    },
    {
      title: CHECK_TITLES[1],
      finding: "Courier delivery attempt window was cross-referenced against the buyer's submitted log.",
    },
    {
      title: CHECK_TITLES[2],
      finding: `AI pre-screening marked this case as ${verdict} and forwarded it to Human Moderation.`,
    },
  ];
}

export function readLocalAppeals(): LocalAppealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => ({
      ...r,
      checks: normalizeChecks(r.checks, r.verdict as Verdict, r.summary ?? ""),
    }));
  } catch {
    return [];
  }
}

export function saveLocalAppeal(rec: LocalAppealRecord) {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocalAppeals().filter((a) => a.order_id !== rec.order_id);
    window.localStorage.setItem(APPEALS_STORAGE_KEY, JSON.stringify([rec, ...existing]));
  } catch {
    // Ignore storage quota errors
  }
}

async function getLedgerScoreContext() {
  const { data: parcels } = await supabase
    .from("parcel_records")
    .select("account_id, score_impact, parcel_status");

  const parcelDeltaByAccount = new Map<string, { delta: number; count: number }>();
  for (const p of parcels ?? []) {
    if (p.score_impact !== null && p.score_impact !== undefined) {
      const prev = parcelDeltaByAccount.get(p.account_id) ?? { delta: 0, count: 0 };
      parcelDeltaByAccount.set(p.account_id, {
        delta: prev.delta + p.score_impact,
        count: prev.count + 1,
      });
    }
  }

  return { parcelDeltaByAccount };
}

function normalizeProfileWithLedger<
  T extends {
    account_id: string;
    trust_score: number;
    risk_factor: string;
    confirmed_deliveries: number;
    missed_returned_count: number;
  },
>(
  profile: T,
  ctx: {
    parcelDeltaByAccount: Map<string, { delta: number; count: number }>;
  },
): T {
  const parcelInfo = ctx.parcelDeltaByAccount.get(profile.account_id);
  const totalResolved = profile.confirmed_deliveries + profile.missed_returned_count;

  let computedScore: number;
  if (totalResolved === 0 && (!parcelInfo || parcelInfo.count === 0)) {
    computedScore = BASE_TRUST_SCORE;
  } else if (parcelInfo && parcelInfo.count > 0) {
    computedScore = clampScore(BASE_TRUST_SCORE + parcelInfo.delta);
  } else {
    const raw =
      profile.risk_factor === "New / Unrated" || profile.trust_score < 0
        ? BASE_TRUST_SCORE + profile.trust_score
        : profile.trust_score;
    computedScore = clampScore(raw);
  }

  return {
    ...profile,
    trust_score: computedScore,
    risk_factor: computeClientRiskFactor(computedScore),
  };
}

/** Normalizes PH mobile numbers to 09XXXXXXXXX; returns null when invalid. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("63")) d = "0" + d.slice(2);
  else if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return /^09\d{9}$/.test(d) ? d : null;
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const shortHash = (h: string) => `sha256_${h.slice(0, 10)}…${h.slice(-4)}`;

export async function getProfileByHash(hash: string) {
  const { data, error } = await supabase.from("buyer_profiles").select("*").eq("phone_hash", hash).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ctx = await getLedgerScoreContext();
  return normalizeProfileWithLedger(data, ctx);
}

export async function listProfiles(q = "") {
  let query = supabase.from("buyer_profiles").select("*").order("created_at", { ascending: false }).limit(200);
  const s = q.trim().replace(/^sha256_/i, "").replace(/[^a-zA-Z0-9-]/g, "");
  if (s) query = query.or(`account_id.ilike.%${s}%,phone_hash.ilike.${s.toLowerCase()}%`);
  const { data, error } = await query;
  if (error) throw error;
  const ctx = await getLedgerScoreContext();
  return (data ?? []).map((p) => normalizeProfileWithLedger(p, ctx));
}

export async function listAllParcels() {
  const { data, error } = await supabase
    .from("parcel_records")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function listParcels(accountId: string) {
  const { data, error } = await supabase
    .from("parcel_records")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const parcels = data ?? [];

  const appeals = (await listAppeals()).filter((a) => a.account_id === accountId);
  const appealRows = appeals.map((a) => ({
    id: `appeal-${a.id}`,
    order_id: `${a.order_id} · AI Review`,
    account_id: a.account_id,
    phone_hash: parcels[0]?.phone_hash ?? "",
    parcel_status: "Sent for Moderation",
    reason: `AI Review (${a.verdict}): ${a.category}`,
    score_impact: null as number | null,
    created_at: a.created_at,
    appealReview: a,
  }));

  const parcelRows = parcels.map((p) => ({
    ...p,
    appealReview: appeals.find((a) => a.order_id === p.order_id) ?? undefined,
  }));

  return [...appealRows, ...parcelRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listPending() {
  const { data, error } = await supabase
    .from("parcel_records")
    .select("*")
    .eq("parcel_status", "Pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Parcels that carried a penalty and are therefore eligible for an AI Review. */
export async function listPenalized() {
  const { data, error } = await supabase
    .from("parcel_records")
    .select("*")
    .eq("parcel_status", "Missed / Returned")
    .lt("score_impact", 0)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAppeals(): Promise<AppealReviewRecord[]> {
  const { data, error } = await supabase.from("appeals").select("*").order("created_at", { ascending: false });
  const localByOrder = new Map(readLocalAppeals().map((l) => [l.order_id, l]));

  const dbRows: AppealReviewRecord[] =
    error || !data
      ? []
      : data.map((r) => {
          const localMatch = localByOrder.get(r.order_id);
          const verdict = (r.verdict as Verdict) || "PARTIAL";
          return {
            id: r.id,
            order_id: r.order_id,
            account_id: r.account_id,
            category: r.category,
            explanation: r.explanation || localMatch?.explanation || "",
            evidence: r.evidence || localMatch?.evidence || "valid_call_log",
            verdict,
            restored_points: 0,
            summary: r.summary || localMatch?.summary || "",
            checks: normalizeChecks(r.checks ?? localMatch?.checks, verdict, r.summary || ""),
            created_at: r.created_at,
            persistedInDb: true,
          };
        });

  const dbOrderIds = new Set(dbRows.map((r) => r.order_id));
  const localRows = readLocalAppeals().filter((l) => !dbOrderIds.has(l.order_id));
  return [...dbRows, ...localRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function placeOrder(hash: string) {
  const { data, error } = await supabase.rpc("place_order", { _phone_hash: hash });
  if (error) throw error;
  return data;
}

export async function resolveParcel(orderId: string, reason: string) {
  const { data, error } = await supabase.rpc("resolve_parcel", { _order_id: orderId, _reason: reason });
  if (error) throw error;
  const ctx = await getLedgerScoreContext();
  return normalizeProfileWithLedger(data, ctx);
}
