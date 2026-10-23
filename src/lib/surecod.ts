import { supabase } from "@/integrations/supabase/client";

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
  return data;
}

export async function listProfiles(q: string) {
  let query = supabase.from("buyer_profiles").select("*").order("created_at", { ascending: false }).limit(200);
  const s = q.trim().replace(/^sha256_/i, "").replace(/[^a-zA-Z0-9-]/g, "");
  if (s) query = query.or(`account_id.ilike.%${s}%,phone_hash.ilike.${s.toLowerCase()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listParcels(accountId: string) {
  const { data, error } = await supabase.from("parcel_records").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listPending() {
  const { data, error } = await supabase.from("parcel_records").select("*").eq("parcel_status", "Pending").order("created_at", { ascending: true });
  if (error) throw error;
  return data;
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
