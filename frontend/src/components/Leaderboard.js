import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import { shortClass, ufcProfileUrl } from "../lib";

const MEDALS = [
  { text: "text-gold", glow: "from-gold/25", ring: "ring-2 ring-gold/70", border: "hover:border-gold/50" },
  { text: "text-zinc-300", glow: "from-zinc-300/15", ring: "ring-2 ring-zinc-300/50", border: "hover:border-zinc-300/40" },
  { text: "text-[#d08a57]", glow: "from-[#d08a57]/20", ring: "ring-2 ring-[#d08a57]/60", border: "hover:border-[#d08a57]/50" },
];

const eloOf = (f) => f.Elo ?? f["Peak Elo"] ?? 0;

function PodiumCard({ fighter, rank, photos, onOpen, className = "" }) {
  const m = MEDALS[rank - 1];
  return (
    <button
      onClick={() => onOpen(fighter)}
      className={`group relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 p-5 text-left transition-all duration-300
        hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] ${m.border} animate-fade-up ${className}`}
      style={{ animationDelay: `${rank * 70}ms` }}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${m.glow} to-transparent opacity-60 transition-opacity group-hover:opacity-100`} />
      <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[150px] leading-none text-outline select-none">
        {rank}
      </span>

      <div className="relative flex items-center gap-4">
        <Avatar name={fighter.Fighter} photos={photos} size={rank === 1 ? "xl" : "lg"} ring={m.ring} />
        <div className="min-w-0">
          <div className={`font-display text-2xl leading-none ${m.text}`}>#{rank}</div>
          <div className="mt-1 font-cond text-xl sm:text-2xl font-bold uppercase leading-tight tracking-wide text-white">
            {fighter.Fighter}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {fighter["Weight Class"]} · {fighter.Record}
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div className="min-h-[22px]">
          <StatusBadge status={fighter.Status} />
        </div>
        <div className="text-right">
          <div className="label">Elo</div>
          <div className="font-display text-4xl leading-none text-white num">{eloOf(fighter).toFixed(0)}</div>
        </div>
      </div>
    </button>
  );
}

function Row({ fighter, rank, index, photos, onOpen, scale }) {
  const elo = eloOf(fighter);
  const pct = Math.max(4, Math.min(100, ((elo - scale.min) / (scale.max - scale.min || 1)) * 100));

  return (
    <div
      className="group relative grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_1fr_9rem_5rem_9rem] items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3
        border-b border-ink-800 last:border-0 transition-colors hover:bg-ink-850 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blood scale-y-0 transition-transform duration-200 group-hover:scale-y-100" />

      <div className="font-display text-2xl text-zinc-600 group-hover:text-zinc-300 transition-colors num">{rank}</div>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={fighter.Fighter} photos={photos} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpen(fighter)}
              className="truncate text-left text-sm sm:text-[15px] font-semibold text-zinc-100 hover:text-blood-light transition-colors"
            >
              {fighter.Fighter}
            </button>
            <a
              href={ufcProfileUrl(fighter.Fighter)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blood-light"
              title="UFC.com profile"
              aria-label={`${fighter.Fighter} UFC.com profile`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14 4h6v6M20 4L10 14M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusBadge status={fighter.Status} compact />
            {!fighter.Status && (
              <span className="sm:hidden truncate text-xs text-zinc-500">{shortClass(fighter["Weight Class"])}</span>
            )}
          </div>
        </div>
      </div>

      <div className="hidden sm:block truncate text-sm text-zinc-400">{fighter["Weight Class"]}</div>
      <div className="hidden sm:block text-sm text-zinc-400 num">{fighter.Record}</div>

      <div className="text-right">
        <div className="font-display text-2xl leading-none text-white num">{elo.toFixed(0)}</div>
        <div className="mt-1.5 ml-auto h-1 w-16 sm:w-full overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full origin-left rounded-full bg-gradient-to-r from-blood-dark to-blood animate-grow-x"
            style={{ width: `${pct}%`, animationDelay: `${Math.min(index, 20) * 30 + 150}ms` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard({ fighters, photos, onOpen, showPodium }) {
  const podium = showPodium && fighters.length >= 3 ? fighters.slice(0, 3) : [];
  const rest = fighters.slice(podium.length);
  const elos = fighters.map(eloOf);
  const scale = { min: Math.min(...elos) * 0.97, max: Math.max(...elos) };

  return (
    <div className="space-y-6">
      {podium.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 md:items-end">
          <PodiumCard fighter={podium[1]} rank={2} photos={photos} onOpen={onOpen} className="md:order-1" />
          <PodiumCard fighter={podium[0]} rank={1} photos={photos} onOpen={onOpen} className="order-first md:order-2 md:pb-9" />
          <PodiumCard fighter={podium[2]} rank={3} photos={photos} onOpen={onOpen} className="md:order-3" />
        </div>
      )}

      {rest.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="hidden sm:grid grid-cols-[3rem_1fr_9rem_5rem_9rem] gap-4 border-b border-ink-700 px-5 py-3">
            <span className="label">#</span>
            <span className="label">Fighter</span>
            <span className="label">Division</span>
            <span className="label">Record</span>
            <span className="label text-right">Elo</span>
          </div>
          {rest.map((f, i) => (
            <Row
              key={f.Fighter}
              fighter={f}
              rank={i + podium.length + 1}
              index={i}
              photos={photos}
              onOpen={onOpen}
              scale={scale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
