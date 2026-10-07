import { statusKind } from "../lib";

export function Belt({ className = "h-3 w-3" }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" />
    </svg>
  );
}

export default function Status({ status, streak }) {
  const kind = statusKind(status);
  if (!kind) return null;
  const base = "mono inline-flex items-center gap-1 whitespace-nowrap text-[10px]";

  if (kind === "champ" || kind === "interim") {
    return (
      <span className={`${base} text-blood`}>
        <Belt />
        {kind === "champ" ? "Champion" : "Interim"}
        {streak > 1 && <span className="hidden sm:inline">· {streak} straight title wins</span>}
      </span>
    );
  }

  return <span className={`${base} text-mute-light`}>Former champ</span>;
}
