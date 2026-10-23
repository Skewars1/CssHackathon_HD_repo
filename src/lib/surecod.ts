import { supabase } from "@/integrations/supabase/client";
import type { Verdict } from "@/lib/appeals";

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

export type LocalAppealRecord = {
  id: string;
  order_id: string;
  account_id: string;
  category: string;
  explanation: string;
  evidence: string;
  verdict: Verdict;
  restored_points: number;
  summary: string;
  created_at: string;
  persistedInDb: boolean;
};

const APPEALS_STORAGE_KEY = "surecod_appeals_v1";

export function readLocalAppeals(): LocalAppealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

function computeClientRiskFactor(score: number, resolvedCount: number): string {
  if (resolvedCount <= 0) return "New / Unrated";
  if (score >= 20) return "Trusted";
  if (score >= -10) return "Watchlist";
  return "High Risk";
}

function applyLocalAppealsToProfile<
  T extends {
    account_id: string;
    trust_score: number;
    risk_factor: string;
    confirmed_deliveries: number;
    missed_returned_count: number;
  },
>(profile: T, dbAppealedOrders: Set<string>): T {
  const localOnly = readLocalAppeals().filter(
    (a) => a.account_id === profile.account_id && !a.persistedInDb && !dbAppealedOrders.has(a.order_id),
  );
  if (localOnly.length === 0) return profile;
  const bonus = localOnly.reduce((sum, a) => sum + (a.restored_points || 0), 0);
  if (bonus === 0) return profile;
  const newScore = profile.trust_score + bonus;
  const resolved = profile.confirmed_deliveries + profile.missed_returned_count;
  return {
    ...profile,
    trust_score: newScore,
    risk_factor: computeClientRiskFactor(newScore, resolved),
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

async function getDbAppealedOrderSet(): Promise<Set<string>> {
  const { data, error } = await supabase.from("appeals").select("order_id");
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.order_id));
}

export async function getProfileByHash(hash: string) {
  const { data, error } = await supabase.from("buyer_profiles").select("*").eq("phone_hash", hash).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const dbSet = await getDbAppealedOrderSet();
  return applyLocalAppealsToProfile(data, dbSet);
}

export async function listProfiles(q: string) {
  let query = supabase.from("buyer_profiles").select("*").order("created_at", { ascending: false }).limit(200);
  const s = q.trim().replace(/^sha256_/i, "").replace(/[^a-zA-Z0-9-]/g, "");
  if (s) query = query.or(`account_id.ilike.%${s}%,phone_hash.ilike.${s.toLowerCase()}%`);
  const { data, error } = await query;
  if (error) throw error;
  const dbSet = await getDbAppealedOrderSet();
  return (data ?? []).map((p) => applyLocalAppealsToProfile(p, dbSet));
}

export async function listParcels(accountId: string) {
  const { data, error } = await supabase
    .from("parcel_records")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const parcels = data ?? [];

  // Merge any resolved appeals for this account into the transaction history so
  // the Seller Risk Lookup ledger shows the exact point restoration alongside the original penalty.
  const appeals = (await listAppeals()).filter((a) => a.account_id === accountId);
  const appealRows = appeals.map((a) => ({
    id: `appeal-${a.id}`,
    order_id: `${a.order_id} · Appeal`,
    account_id: a.account_id,
    phone_hash: parcels[0]?.phone_hash ?? "",
    parcel_status:
      a.verdict === "APPROVED"
        ? "Appeal Approved"
        : a.verdict === "PARTIAL"
          ? "Appeal Partial"
          : "Appeal Rejected",
    reason: `AI Appeal (${a.verdict}): ${a.category}`,
    score_impact: a.restored_points,
    created_at: a.created_at,
  }));

  return [...appealRows, ...parcels].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listPending() {
  const { data, error } = await supabase.from("parcel_records").select("*").eq("parcel_status", "Pending").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Parcels that carried a penalty and are therefore eligible to be appealed. */
export async function listPenalized() {
  const { data, error } = await supabase.from("parcel_records").select("*").eq("parcel_status", "Missed / Returned").lt("score_impact", 0).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAppeals() {
  const { data, error } = await supabase.from("appeals").select("*").order("created_at", { ascending: false });
  const dbRows = error || !data ? [] : data;
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
  return data;
}
