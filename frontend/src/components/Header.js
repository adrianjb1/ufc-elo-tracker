import { useEffect, useRef } from "react";
import { MEN_CLASSES, WOMEN_CLASSES, formatDate, signed, titleCase } from "../lib";
import { Belt } from "./Status";

const VIEWS = [
  { value: "current", label: "Current" },
  { value: "peak", label: "All-Time" },
  { value: "trending", label: "Trending" },
];

const TITLES = {
  current: ["Current", "Elo Rankings"],
  peak: ["All-Time", "Peak Elo"],
  trending: ["Momentum", "Elo Movers"],
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function SelectField({ value, onChange, children, ariaLabel }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="underline-field mono cursor-pointer appearance-none pr-8 !text-sm"
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

const TICKER_SPEED = 40;

function useMarquee(ready) {
  const track = useRef(null);
  const paused = useRef(false);
  const offset = useRef(0);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let last = performance.now();
    let frame;
    const tick = (now) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      if (!paused.current) {
        const half = el.scrollWidth / 2;
        offset.current = half ? (offset.current + TICKER_SPEED * dt) % half : 0;
        el.style.transform = `translate3d(${-offset.current}px, 0, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  const handlers = {
    onMouseEnter: () => (paused.current = true),
    onMouseLeave: () => (paused.current = false),
  };
  return [track, handlers];
}

function Ticker({ latest }) {
  const [track, handlers] = useMarquee(Boolean(latest?.fights?.length));
  if (!latest?.fights?.length) return null;
  const items = latest.fights.filter((f) => f.Decisive);
  return (
    <div className="flex items-stretch border-t border-line-dark">
      <div className="mono z-10 flex shrink-0 items-center gap-2 bg-blood px-3 sm:px-4 text-[11px] text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white animate-live-pulse" />
        <span className="hidden sm:inline">Latest ·</span> {formatDate(latest.date, { month: "short", day: "numeric" })}
      </div>
      <div className="relative flex-1 overflow-hidden py-2.5 [mask-image:linear-gradient(90deg,transparent,black_3%,black_95%,transparent)]" {...handlers}>
        <div ref={track} className="flex w-max will-change-transform">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
              <span className="mono px-5 text-[11px] text-mute-light">{latest.event}</span>
              {items.map((f) => (
                <span key={f.Winner} className="flex items-center gap-2 px-5 text-[13px] text-paper whitespace-nowrap">
                  {f.Title && <Belt className="h-3.5 w-3.5 text-[#e8b54a]" />}
                  <span className="font-bold">{f.Winner}</span>
                  <span className="mono text-[10px] text-mute-light">def.</span>
                  <span className="text-paper/70">{f.Loser}</span>
                  <span className="mono text-[10px] text-mute-light">
                    {f.Method}{f.Round ? ` R${f.Round}` : ""}
                  </span>
                  <span className="mono text-[11px] text-win-light num">{signed(f.Change)}</span>
                  <span className="pl-3 text-line-dark">/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TopBar({ meta, latest }) {
  return (
    <header className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 sm:px-10 py-3.5">
        <a href="/" className="group flex items-center gap-2.5" aria-label="UFC Elo home">
          <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
            <polygon points="10.5,2 21.5,2 30,10.5 30,21.5 21.5,30 10.5,30 2,21.5 2,10.5" fill="none" stroke="#d20a11" strokeWidth="2" />
            <polyline
              points="8,21 13,16 17,19 24,11"
              fill="none"
              stroke="#faf8f3"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            <circle cx="24" cy="11" r="1.9" fill="#d20a11" />
          </svg>
          <span className="display text-[26px] tracking-[0.02em]">
            UFC <span className="text-blood">Elo</span>
          </span>
        </a>
        {meta?.data_updated_through && (
          <div className="mono text-[11px] text-mute-light">
            <span className="hidden sm:inline">Data through </span>
            <span className="text-paper">{formatDate(meta.data_updated_through, { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        )}
      </div>
      <Ticker latest={latest} />
    </header>
  );
}

export default function Header({ view, onView, search, setSearch, division, setDivision, limit, setLimit, summary }) {
  const [kicker, title] = TITLES[view];
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <h1 className="animate-fade-up">
          <span className="mono block text-xs sm:text-sm text-blood">{kicker}</span>
          <span className="display mt-1 block text-[64px] sm:text-[112px] lg:text-[132px]">{title}</span>
        </h1>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        {view !== "trending" ? (
          <div className="grid gap-6 sm:grid-cols-[1.6fr_1fr_0.6fr]">
            <Field label="Search">
              <div className="relative">
                <svg className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M20 20l-4-4" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Fighter name"
                  className="underline-field pl-7"
                />
              </div>
            </Field>
            <Field label="Division">
              <SelectField value={division} onChange={setDivision} ariaLabel="Division">
                <option value="all">All divisions</option>
                <option value="men">All men's</option>
                <option value="women">All women's</option>
                <optgroup label="Men">
                  {MEN_CLASSES.map((wc) => <option key={wc} value={wc}>{titleCase(wc)}</option>)}
                </optgroup>
                <optgroup label="Women">
                  {WOMEN_CLASSES.map((wc) => <option key={wc} value={wc}>{titleCase(wc).replace("Women's ", "W. ")}</option>)}
                </optgroup>
              </SelectField>
            </Field>
            <Field label="Show">
              <SelectField value={limit} onChange={(v) => setLimit(Number(v))} ariaLabel="Number of fighters">
                {[25, 50, 100, 250].map((n) => <option key={n} value={n}>Top {n}</option>)}
              </SelectField>
            </Field>
          </div>
        ) : (
          <p className="max-w-xl text-[15px] text-ink-soft">Net Elo change across each active fighter's last three UFC fights.</p>
        )}

        <div className="flex border-2 border-ink" role="tablist">
          {VIEWS.map((v, i) => (
            <button
              key={v.value}
              role="tab"
              aria-selected={view === v.value}
              onClick={() => onView(v.value)}
              className={`toggle flex-1 lg:flex-none ${i ? "border-l-2 border-ink" : ""} ${view === v.value ? "bg-ink text-paper" : "hover:bg-canvas"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <p className="eyebrow mt-6 min-h-[1rem] !text-ink-soft">{summary}</p>
    </div>
  );
}
