import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Crumbs, Icon, Panel, RiskBadge, ScoreScaleBar } from "@/lib/ui";
import {
  BASE_TRUST_SCORE,
  getPaymentEligibility,
  getProfileByHash,
  normalizePhone,
  placeOrder,
  sha256,
  shortHash,
} from "@/lib/surecod";

const PRODUCT_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDHG1UQHQGi00vOJeG1H3J5WCDv5kVkQn2loH3wWavEOPOHQjenJsq2RUXb7RBlrFxFvHnixtHkbQz3kh6_PR9TsMPppH1PTN6HacQiq7m6k12yajrzsyZb9snYZS5z2qTLbyR-LLK1pEDM_yqlumKp2kfb3VEvQG_a0Qujl6xeLycM8E-zSL1FvYXUMaB6d4Wp3gU5AZBEX-z__l7UcMUH9EiapX76cvnRM8SQc7qRstTFi9dsS9AJyw";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout Simulator — SureCOD" },
      { name: "description", content: "Risk-aware COD checkout with 0–100 anonymized buyer scoring." },
      { property: "og:title", content: "Checkout Simulator — SureCOD" },
      { property: "og:description", content: "Risk-aware COD checkout with 0–100 anonymized buyer scoring." },
    ],
  }),
  component: Checkout,
});

type Pay = "cod" | "protected" | "upfront";

function Checkout() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [choice, setChoice] = useState<Pay | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ order: string; account: string } | null>(null);

  const normalized = normalizePhone(phone);
  useEffect(() => {
    let live = true;
    if (!normalized) {
      setHash(null);
      return;
    }
    sha256(normalized).then((h) => live && setHash(h));
    return () => {
      live = false;
    };
  }, [normalized]);

  const profile = useQuery({
    queryKey: ["profile-hash", hash],
    queryFn: () => getProfileByHash(hash!),
    enabled: !!hash,
  });

  const p = profile.data;
  // Everyone starts at 50 (Max 100)
  const score = p ? p.trust_score : BASE_TRUST_SCORE;
  const eligibility = getPaymentEligibility(score);
  const codOk = eligibility.standardCodAllowed; // >= 70 (Trusted)
  const protectedOk = eligibility.protectedCodAllowed; // > 20 (Trusted, Neutral, Watchlist)

  const active: Pay =
    choice && !(choice === "cod" && !codOk) && !(choice === "protected" && !protectedOk)
      ? choice
      : codOk
        ? "cod"
        : protectedOk
          ? "protected"
          : "upfront";

  const cta =
    active === "cod"
      ? "Place Order with Standard COD (₱830)"
      : active === "protected"
        ? "Place Order with Protected COD (₱80 Deposit)"
        : "Place Order · Pay ₱830 Full Upfront";

  const submit = async () => {
    if (!hash) return;
    setBusy(true);
    setError(null);
    try {
      const rec = await placeOrder(hash);
      setResult({ order: rec.order_id, account: rec.account_id });
      qc.invalidateQueries();
    } catch {
      setError("Could not place the order. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const opt = (key: Pay, title: string, sub: string, icon: string, disabled: boolean, tag?: string) => (
    <button
      key={key}
      type="button"
      disabled={disabled}
      onClick={() => setChoice(key)}
      className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
        disabled
          ? "opacity-55 cursor-not-allowed bg-stone/70 border-border"
          : active === key
            ? "border-2 border-primary bg-gradient-to-r from-blue-600/8 to-sky-500/8 shadow-md shadow-primary/10 -translate-y-0.5 cursor-pointer"
            : "border-border bg-ivory hover-row-highlight cursor-pointer"
      }`}
    >
      <span className="flex items-center gap-3.5">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            disabled
              ? "bg-border/70 text-muted-foreground"
              : active === key
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "bg-stone text-primary"
          }`}
        >
          <Icon name={disabled ? "lock" : icon} className="text-[19px]" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </span>
      </span>
      {tag && (
        <span
          className={`font-mono text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
            disabled
              ? "bg-border/80 text-muted-foreground"
              : key === "cod"
                ? "bg-trusted/15 text-trusted border border-trusted/30"
                : "bg-primary/15 text-primary border border-primary/30"
          }`}
        >
          {tag}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-5">
      <Crumbs items={["SureCOD", "Checkout Simulator"]} tag="0–100 Scale (Start: 50)" />

      {/* Navy Hero Strip */}
      <div className="navy-hero-banner rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="font-heading text-2xl font-bold">Risk-Aware COD Checkout</h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-0.5">
            The buyer&apos;s phone is hashed client-side with SHA-256. Payment routes dynamically unlock based on
            the 0–100 trust score.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
            &ge;70 Trusted (Standard COD)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-400/30 text-sky-200">
            35–69 Neutral (Protected COD)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-300">
            &lt;35 Watchlist (1st @ 30)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-300">
            &le;20 High Risk (Upfront Only)
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[370px_1fr] gap-6">
        {/* Left: Cart Summary + Policy Card */}
        <div className="space-y-5">
          <Panel className="p-5" interactive>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-base">Order Summary</h2>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[10px] font-bold">
                1 Item
              </span>
            </div>
            <div className="flex gap-3.5 pb-4 border-b border-border">
              <img
                src={PRODUCT_IMG}
                alt="Heavyweight boxy tee"
                className="w-20 h-20 rounded-xl object-cover bg-stone border border-border"
              />
              <div className="text-sm flex flex-col justify-center">
                <div className="font-bold text-foreground">Minimalist Heavyweight Boxy Tee</div>
                <div className="text-muted-foreground text-xs mt-0.5">Midnight Navy (M) · Qty: 1</div>
                <div className="font-mono text-xs font-bold text-primary mt-1">₱750.00</div>
              </div>
            </div>
            <dl className="font-mono text-xs space-y-2.5 pt-4">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold">₱750.00</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Insured Courier Shipping</dt>
                <dd className="font-semibold">₱80.00</dd>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-border text-sm font-bold text-foreground">
                <dt>Total Payable</dt>
                <dd className="text-primary">₱830.00</dd>
              </div>
            </dl>
          </Panel>

          <Panel className="p-5 bg-gradient-to-br from-blue-600/6 to-indigo-600/6" interactive>
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-primary mb-2.5 flex items-center gap-1.5">
              <Icon name="verified_user" className="text-[16px]" />
              <span>0–100 Scoring Policy</span>
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Everyone starts at 50</strong> (Neutral tier, 35–69):
                  eligible for Protected COD or Full Upfront. Reach <strong className="text-trusted">70+</strong>{" "}
                  to unlock Standard COD!
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-watchlist mt-1.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Watchlist (&lt;35, first restriction at 30)</strong>:
                  flagged for courier verification; requires Protected COD deposit or Full Upfront.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-rto mt-1.5 shrink-0" />
                <span>
                  <strong className="text-foreground">High Risk (&le;20)</strong>: both COD options are locked;
                  only Full Upfront payment remains.
                </span>
              </li>
            </ul>
          </Panel>
        </div>

        {/* Right: Phone Hash Verification & Dynamic Payment Gate */}
        <Panel className="p-6" interactive>
          <h2 className="font-heading font-bold text-lg mb-1">Buyer Verification &amp; Payment Gate</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Enter a Philippine mobile number (09XXXXXXXXX) to compute its SHA-256 hash and evaluate COD
            eligibility.
          </p>

          <label className="block text-xs font-semibold text-foreground mb-4">
            Buyer Mobile Number (PH)
            <div className="relative mt-1.5">
              <Icon
                name="smartphone"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-[18px]"
              />
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setResult(null);
                }}
                placeholder="0917 123 4567"
                inputMode="tel"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-canvas text-sm font-mono text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            {phone && !normalized && (
              <span className="text-rto text-[11px] mt-1 inline-block">
                Enter a valid 11-digit PH mobile number (09XXXXXXXXX).
              </span>
            )}
          </label>

          {hash && (
            <div className="mb-5 rounded-2xl border border-primary/25 bg-stone/75 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-muted-foreground flex items-center gap-1.5">
                  <Icon name="tag" className="text-[14px] text-primary" />
                  {shortHash(hash)}
                </span>
                {profile.isLoading ? (
                  <span className="text-muted-foreground font-mono">Checking ledger…</span>
                ) : p ? (
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{p.account_id}</span>
                    <span className="font-mono font-bold text-primary">{p.trust_score} / 100</span>
                    <RiskBadge risk={p.risk_factor} />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      New Buyer · Starts at {BASE_TRUST_SCORE}/100
                    </span>
                    <RiskBadge risk="Neutral" />
                  </span>
                )}
              </div>

              <ScoreScaleBar score={score} />
            </div>
          )}

          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
            Available Payment Routes
          </h3>
          <div className="space-y-2.5 mb-6">
            {opt(
              "cod",
              "Standard COD — Pay ₱830 on Delivery",
              codOk
                ? "Unlocked! Buyer has Trusted status (Score ≥ 70)"
                : `Locked · Requires Trusted score ≥ 70 (Current: ${score}/100). Complete Protected COD orders to reach 70+!`,
              "local_shipping",
              !codOk,
              codOk ? "Unlocked" : "Requires ≥70",
            )}
            {opt(
              "protected",
              "Protected COD — ₱80 GCash Deposit + ₱750 on Delivery",
              protectedOk
                ? "Shipping fee held in escrow · +15 pts upon confirmed delivery"
                : `Locked · Unavailable for High Risk buyers (Score ≤ 20, Current: ${score}/100)`,
              "verified_user",
              !protectedOk,
              protectedOk && !codOk ? "Recommended" : !protectedOk ? "Locked (≤20)" : "Eligible",
            )}
            {opt(
              "upfront",
              "Full Upfront — ₱830 via GCash / QRPh / Card",
              "Instant priority dispatch · Zero return-to-origin (RTO) risk",
              "qr_code_scanner",
              false,
              !protectedOk ? "Required (Score ≤20)" : "Always Available",
            )}
          </div>

          {result ? (
            <div className="rounded-2xl bg-trusted/12 border border-trusted/30 text-trusted px-4 py-3.5 text-sm flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-bold">
                <Icon name="check_circle" className="text-[20px]" />
                Order {result.order} dispatched as Pending for {result.account}
              </span>
              <Link
                to="/outcomes"
                className="px-3 py-1 rounded-lg bg-trusted text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Log Delivery Outcome →
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!hash || busy}
              className="hover-glow-btn w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-sky-500 text-white disabled:opacity-50 cursor-pointer"
            >
              {busy ? (
                <>
                  <Icon name="progress_activity" className="text-[18px] animate-spin" />
                  <span>Placing Order…</span>
                </>
              ) : (
                <>
                  <Icon name="lock" className="text-[18px]" />
                  <span>{cta}</span>
                </>
              )}
            </button>
          )}
          {error && <p className="text-rto text-xs mt-2 font-medium">{error}</p>}
        </Panel>
      </div>
    </div>
  );
}
