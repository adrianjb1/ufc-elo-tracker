import { statusKind } from "../lib";

export default function Status({ status }) {
  const kind = statusKind(status);
  if (!kind) return null;

  if (kind === "champ") {
    const defenses = status.match(/\((\d+)/)?.[1];
    return (
      <span className="wide inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.06em] text-blood">
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" />
        </svg>
        Champion
        {defenses > 0 && <span className="hidden sm:inline">· {defenses} def</span>}
      </span>
    );
  }

  return (
    <span className={`wide whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.06em] ${kind === "interim" ? "text-blood" : "text-mute-light"}`}>
      {kind === "interim" ? "Interim Champion" : "Former Champion"}
    </span>
  );
}
