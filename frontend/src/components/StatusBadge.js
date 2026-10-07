import { statusKind } from "../lib";

export default function StatusBadge({ status, compact = false }) {
  const kind = statusKind(status);
  if (!kind) return null;

  if (kind === "champ") {
    const defenses = status.match(/\((.*)\)/)?.[1];
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5">
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-gold" aria-hidden="true">
          <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" />
        </svg>
        <span className="gold-shimmer font-cond text-[11px] font-bold uppercase tracking-[0.14em]">Champion</span>
        {!compact && defenses && <span className="text-[10px] text-gold/70 num">{defenses}</span>}
      </span>
    );
  }

  const styles = {
    interim: "border-blood/40 bg-blood/10 text-blood-light",
    former: "border-ink-600 bg-ink-800 text-zinc-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-cond text-[11px] font-semibold uppercase tracking-[0.14em] ${styles[kind]}`}>
      {kind === "interim" ? "Interim Champ" : "Former Champ"}
    </span>
  );
}
