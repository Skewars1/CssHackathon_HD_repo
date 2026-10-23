import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Crumbs, Icon, Panel, RiskBadge } from "@/lib/ui";
import { getProfileByHash, normalizePhone, placeOrder, sha256, shortHash } from "@/lib/surecod";

const PRODUCT_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDHG1UQHQGi00vOJeG1H3J5WCDv5kVkQn2loH3wWavEOPOHQjenJsq2RUXb7RBlrFxFvHnixtHkbQz3kh6_PR9TsMPppH1PTN6HacQiq7m6k12yajrzsyZb9snYZS5z2qTLbyR-LLK1pEDM_yqlumKp2kfb3VEvQG_a0Qujl6xeLycM8E-zSL1FvYXUMaB6d4Wp3gU5AZBEX-z__l7UcMUH9EiapX76cvnRM8SQc7qRstTFi9dsS9AJyw";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Checkout — SureCOD" },
      { name: "description", content: "Risk-aware COD checkout with anonymized buyer scoring." },
      { property: "og:title", content: "Checkout — SureCOD" },
      { property: "og:description", content: "Risk-aware COD checkout with anonymized buyer scoring." },
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
    if (!normalized) { setHash(null); return; }
    sha256(normalized).then((h) => live && setHash(h));
    return () => { live = false; };
  }, [normalized]);

  const profile = useQuery({ queryKey: ["profile-hash", hash], queryFn: () => getProfileByHash(hash!), enabled: !!hash });
  const p = profile.data;
  const risk = p?.risk_factor ?? "New / Unrated";
  const codOk = risk === "Trusted";
  const protectedOk = risk !== "High Risk";
  const active: Pay = choice && !(choice === "cod" && !codOk) && !(choice === "protected" && !protectedOk) ? choice : codOk ? "cod" : protectedOk ? "protected" : "upfront";
  const cta = active === "cod" ? "Place Order with COD (₱830)" : active === "protected" ? "Place Order with Protected COD (₱80)" : "Place Order · Pay ₱830 Upfront";

  const submit = async () => {
    if (!hash) return;
    setBusy(true); setError(null);
    try {
      const rec = await placeOrder(hash);
      setResult({ order: rec.order_id, account: rec.account_id });
      qc.invalidateQueries();
    } catch {
      setError("Could not place the order. Please try again.");
    } finally { setBusy(false); }
  };

  const opt = (key: Pay, title: string, sub: string, disabled: boolean, tag?: string) => (
    <button key={key} disabled={disabled} onClick={() => setChoice(key)}
      className={`w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded border transition-colors ${disabled ? "opacity-50 cursor-not-allowed bg-stone border-border" : active === key ? "border-2 border-foreground bg-ivory" : "border-border bg-ivory hover:bg-stone"}`}>
      <span className="flex items-center gap-3">
        {disabled ? <Icon name="lock" className="text-[16px] text-muted-foreground" /> : <span className={`w-3.5 h-3.5 rounded-full border-2 ${active === key ? "border-foreground bg-foreground" : "border-border"}`} />}
        <span className="flex flex-col"><span className="text-sm font-semibold">{title}</span><span className="text-xs text-muted-foreground">{sub}</span></span>
      </span>
      {tag && <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded ${disabled ? "bg-border text-muted-foreground" : "bg-trusted/15 text-trusted"}`}>{tag}</span>}
    </button>
  );

  return (
    <>
      <Crumbs items={["SureCOD", "Checkout"]} />
      <h1 className="font-heading text-2xl font-bold mt-4">Checkout</h1>
      <p className="text-sm text-muted-foreground mb-5">The buyer's phone is hashed in the browser with SHA-256 — only the hash is sent and stored.</p>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <Panel className="p-5 h-fit">
          <h2 className="font-heading font-semibold mb-4">Cart Summary</h2>
          <div className="flex gap-3 pb-4 border-b border-border">
            <img src={PRODUCT_IMG} alt="Heavyweight boxy tee" className="w-20 h-20 rounded object-cover bg-stone" />
            <div className="text-sm"><div className="font-semibold">Minimalist Heavyweight Boxy Tee</div><div className="text-muted-foreground text-xs">Black (M) · Qty: 1</div></div>
          </div>
          <dl className="font-mono text-xs space-y-2 pt-4">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>₱750.00</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>₱80.00</dd></div>
            <div className="flex justify-between pt-2 border-t border-border text-sm font-semibold"><dt>Total</dt><dd>₱830.00</dd></div>
          </dl>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-heading font-semibold mb-4">Shipping &amp; Delivery</h2>
          <label className="block text-xs text-muted-foreground mb-4">Buyer Phone (PH mobile)
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setResult(null); }} placeholder="09XX XXX XXXX" inputMode="tel"
              className="mt-1 w-full px-3 py-2 rounded border border-border bg-canvas text-sm font-mono text-foreground focus:outline-none focus:border-foreground" />
            {phone && !normalized && <span className="text-rto text-[11px]">Enter a valid 11-digit mobile number (09XXXXXXXXX).</span>}
          </label>

          {hash && (
            <div className="mb-5 rounded border border-border bg-stone px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-muted-foreground">{shortHash(hash)}</span>
              {profile.isLoading ? <span className="text-muted-foreground">Checking…</span> : p ? (
                <span className="flex items-center gap-2"><span className="font-mono">{p.account_id}</span> · Score {p.trust_score} <RiskBadge risk={p.risk_factor} /></span>
              ) : <span className="flex items-center gap-2">New buyer · profile created on order <RiskBadge risk="New / Unrated" /></span>}
            </div>
          )}

          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment Route</h3>
          <div className="space-y-2 mb-5">
            {opt("cod", "Standard COD", codOk ? "Pay ₱830 on delivery" : "Requires Trusted status", !codOk, codOk ? "Eligible" : "Unavailable")}
            {opt("protected", "Protected COD — ₱80 GCash now + ₱750 on delivery", protectedOk ? "Deposit held in escrow until delivery" : "Unavailable for High Risk buyers", !protectedOk, protectedOk && !codOk ? "Recommended" : !protectedOk ? "Unavailable" : undefined)}
            {opt("upfront", "Full Upfront — ₱830 via GCash / QRPh", "Instant dispatch, zero RTO exposure", false, !protectedOk ? "Required" : undefined)}
          </div>

          {result ? (
            <div className="rounded bg-trusted/10 text-trusted px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold"><Icon name="check_circle" className="text-[18px]" />Order {result.order} logged as Pending for {result.account}</span>
              <Link to="/outcomes" className="underline text-xs">Log its outcome →</Link>
            </div>
          ) : (
            <button onClick={submit} disabled={!hash || busy}
              className="w-full py-3 rounded font-semibold text-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {busy ? <><Icon name="progress_activity" className="text-[16px] animate-spin" />Placing order…</> : <><Icon name="lock" className="text-[16px]" />{cta}</>}
            </button>
          )}
          {error && <p className="text-rto text-xs mt-2">{error}</p>}
        </Panel>
      </div>
    </>
  );
}
