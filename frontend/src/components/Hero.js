import { formatDate, useCountUp } from "../lib";

function Octagon({ className }) {
  const points = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i + Math.PI / 8;
    return `${50 + 48 * Math.cos(a)},${50 + 48 * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon points={points} fill="none" stroke="currentColor" strokeWidth="0.25" />
      <polygon points={points} fill="none" stroke="currentColor" strokeWidth="0.15" transform="translate(50 50) scale(0.78) translate(-50 -50)" />
      <polygon points={points} fill="none" stroke="currentColor" strokeWidth="0.1" transform="translate(50 50) scale(0.56) translate(-50 -50)" />
    </svg>
  );
}

function Stat({ value, label, delay }) {
  const n = useCountUp(value);
  return (
    <div className="animate-fade-up px-3 sm:px-6 text-center" style={{ animationDelay: `${delay}ms` }}>
      <div className="font-display text-4xl sm:text-5xl leading-none text-white num">
        {value == null ? "—" : Math.round(n).toLocaleString()}
      </div>
      <div className="label mt-2">{label}</div>
    </div>
  );
}

export default function Hero({ meta, champions }) {
  return (
    <header className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-30%] h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-blood/20 blur-[120px]" />
        <Octagon className="absolute left-1/2 top-1/2 h-[780px] w-[780px] -translate-x-1/2 -translate-y-[55%] text-white/[0.06] animate-spin-slow" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-16 sm:pt-24 pb-10 text-center">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-blood animate-live-pulse" />
          <span className="label !text-zinc-400">
            {meta ? `Updated through ${formatDate(meta.data_updated_through, { month: "long", day: "numeric", year: "numeric" })}` : "Loading data"}
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 font-display leading-[0.85] tracking-wide" style={{ animationDelay: "80ms" }}>
          <span className="block text-[18vw] sm:text-[140px] text-white">UFC Elo</span>
          <span className="block text-[9vw] sm:text-[64px] text-blood">Leaderboard</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-5 max-w-xl text-sm sm:text-base text-zinc-400" style={{ animationDelay: "160ms" }}>
          Every UFC fight since 1993, run through a chess-style rating system weighted for recency, finishes, and title fights.
        </p>

        <div className="mt-10 grid grid-cols-3 divide-x divide-ink-700">
          <Stat value={meta?.total_fighters} label="Fighters" delay={240} />
          <Stat value={meta?.total_fights} label="Fights" delay={300} />
          <Stat value={meta?.title_fights} label="Title Fights" delay={360} />
        </div>
      </div>

      {champions.length > 0 && (
        <div className="relative border-y border-ink-700/70 bg-ink-900/60 py-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                {champions.map((c) => (
                  <div key={c.Fighter} className="flex items-center gap-3 px-6">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-gold" aria-hidden="true">
                      <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" />
                    </svg>
                    <span className="font-cond text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">{c.Fighter}</span>
                    <span className="font-cond text-xs uppercase tracking-[0.14em] text-zinc-500">{c["Weight Class"]}</span>
                    <span className="font-display text-lg text-gold num">{Math.round(c.Elo)}</span>
                    <span className="ml-3 text-ink-600">/</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
