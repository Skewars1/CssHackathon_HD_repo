import type { ReactNode } from "react";

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center leading-none ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: "1em" }}>
        {name}
      </span>
    </span>
  );
}

export function Panel({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`bg-ivory border border-border/80 rounded-2xl shadow-[0_4px_20px_-6px_rgba(15,23,42,0.06)] ${
        interactive ? "hover-lift" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Crumbs({ items, tag }: { items: string[]; tag?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
      {items.map((it, i) => (
        <span key={it} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-primary/40 font-bold">›</span>}
          <span
            className={
              i === items.length - 1
                ? "text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full"
                : "hover:text-foreground transition-colors"
            }
          >
            {it}
          </span>
        </span>
      ))}
      {tag && (
        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-navy text-white font-mono text-[10px]">
          {tag}
        </span>
      )}
    </div>
  );
}

export function riskStyle(risk: string) {
  if (risk === "Trusted") {
    return {
      dot: "bg-trusted",
      text: "text-trusted",
      chip: "bg-trusted/15 text-trusted border border-trusted/30",
      bar: "from-emerald-500 to-teal-400",
      label: "Trusted (70–100)",
    };
  }
  if (risk === "Neutral" || risk === "New / Unrated") {
    return {
      dot: "bg-primary",
      text: "text-primary",
      chip: "bg-primary/15 text-primary border border-primary/30",
      bar: "from-blue-600 to-sky-400",
      label: "Neutral (35–69)",
    };
  }
  if (risk === "Watchlist") {
    return {
      dot: "bg-watchlist",
      text: "text-watchlist",
      chip: "bg-watchlist/15 text-watchlist border border-watchlist/30",
      bar: "from-amber-500 to-orange-400",
      label: "Watchlist (21–34)",
    };
  }
  if (risk === "High Risk") {
    return {
      dot: "bg-rto",
      text: "text-rto",
      chip: "bg-rto/15 text-rto border border-rto/30",
      bar: "from-rose-600 to-red-400",
      label: "High Risk (0–20)",
    };
  }
  return {
    dot: "bg-primary",
    text: "text-primary",
    chip: "bg-primary/15 text-primary border border-primary/30",
    bar: "from-blue-600 to-sky-400",
    label: risk,
  };
}

export function RiskBadge({ risk }: { risk: string }) {
  const display = risk === "New / Unrated" ? "Neutral" : risk;
  const s = riskStyle(display);
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-transform duration-150 hover:scale-105 ${s.chip}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {display}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c =
    status === "Confirmed Received" || status === "Appeal Approved"
      ? "bg-trusted/15 text-trusted border border-trusted/30"
      : status === "Missed / Returned" || status === "Appeal Rejected"
        ? "bg-rto/15 text-rto border border-rto/30"
        : status === "Sent for Moderation"
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-watchlist/15 text-watchlist border border-watchlist/30";
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${c}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "Confirmed Received" || status === "Appeal Approved"
            ? "bg-trusted"
            : status === "Missed / Returned" || status === "Appeal Rejected"
              ? "bg-rto"
              : status === "Sent for Moderation"
                ? "bg-primary"
                : "bg-watchlist"
        }`}
      />
      {status}
    </span>
  );
}

export function Impact({ value }: { value: number | null }) {
  if (value === null) return <span className="font-mono text-xs text-muted-foreground">Pending</span>;
  return (
    <span
      className={`inline-flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
        value >= 0 ? "bg-trusted/12 text-trusted" : "bg-rto/12 text-rto"
      }`}
    >
      {value > 0 ? "+" : ""}
      {value} pts
    </span>
  );
}

export function ScoreScaleBar({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier =
    clamped >= 70
      ? "Trusted"
      : clamped >= 35
        ? "Neutral"
        : clamped > 20
          ? "Watchlist"
          : "High Risk";
  const s = riskStyle(tier);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
        <span className="text-muted-foreground">
          Trust Score: <strong className="text-foreground">{clamped}</strong> / 100
        </span>
        <span className={`font-semibold ${s.text}`}>
          {clamped >= 70
            ? "Standard COD Unlocked"
            : clamped > 20
              ? clamped <= 30
                ? "First Restriction (≤30) · Protected COD"
                : "Protected COD / Upfront"
              : "Full Upfront Only (≤20)"}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-stone overflow-hidden border border-border/80">
        {/* Colored background zone hints */}
        <div className="absolute inset-y-0 left-0 w-[20%] bg-rose-500/15" title="High Risk (0-20)" />
        <div className="absolute inset-y-0 left-[20%] w-[15%] bg-amber-500/15" title="Watchlist (21-34)" />
        <div className="absolute inset-y-0 left-[35%] w-[35%] bg-blue-500/15" title="Neutral (35-69)" />
        <div className="absolute inset-y-0 left-[70%] w-[30%] bg-emerald-500/15" title="Trusted (70-100)" />

        {/* Active score bar */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-500`}
          style={{ width: `${Math.max(3, clamped)}%` }}
        />

        {/* Threshold tick marks */}
        {[20, 30, 35, 50, 70].map((mark) => (
          <div
            key={mark}
            className="absolute inset-y-0 w-px bg-navy/25"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
      {!compact && (
        <div className="relative h-4 mt-1 text-[9px] font-mono text-muted-foreground select-none">
          <span className="absolute left-0">0</span>
          <span className="absolute left-[20%] -translate-x-1/2 text-rto font-semibold">20 High Risk</span>
          <span className="absolute left-[30%] -translate-x-1/2 text-watchlist font-semibold">30</span>
          <span className="absolute left-[35%] -translate-x-1/2 text-primary">35</span>
          <span className="absolute left-[50%] -translate-x-1/2 font-semibold text-foreground">50 Start</span>
          <span className="absolute left-[70%] -translate-x-1/2 text-trusted font-semibold">70 Trusted</span>
          <span className="absolute right-0">100</span>
        </div>
      )}
    </div>
  );
}
