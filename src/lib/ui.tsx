import type { ReactNode } from "react";

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center leading-none ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: "1em" }}>{name}</span>
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-ivory border border-border rounded-md ${className}`}>{children}</div>;
}

export function Crumbs({ items, tag }: { items: string[]; tag?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
      {items.map((it, i) => (
        <span key={it} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border">/</span>}
          <span className={i === items.length - 1 ? "text-foreground font-semibold" : ""}>{it}</span>
        </span>
      ))}
      {tag && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-stone font-mono text-[10px] text-foreground">{tag}</span>}
    </div>
  );
}

export function riskStyle(risk: string) {
  if (risk === "Trusted") return { dot: "bg-trusted", text: "text-trusted", chip: "bg-trusted/15 text-trusted" };
  if (risk === "Watchlist") return { dot: "bg-watchlist", text: "text-watchlist", chip: "bg-watchlist/15 text-watchlist" };
  if (risk === "High Risk") return { dot: "bg-rto", text: "text-rto", chip: "bg-rto/15 text-rto" };
  return { dot: "bg-muted-foreground", text: "text-muted-foreground", chip: "bg-stone text-muted-foreground" };
}

export function RiskBadge({ risk }: { risk: string }) {
  const s = riskStyle(risk);
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${s.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{risk}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c = status === "Confirmed Received" ? "bg-trusted/15 text-trusted" : status === "Missed / Returned" ? "bg-rto/15 text-rto" : "bg-watchlist/15 text-watchlist";
  return <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${c}`}>{status}</span>;
}

export function Impact({ value }: { value: number | null }) {
  if (value === null) return <span className="font-mono text-muted-foreground">Pending</span>;
  return <span className={`font-mono font-semibold ${value >= 0 ? "text-trusted" : "text-rto"}`}>{value > 0 ? "+" : ""}{value} pts</span>;
}
