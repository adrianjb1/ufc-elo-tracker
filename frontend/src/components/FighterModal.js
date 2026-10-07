import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";
import { formatDate, getJSON, signed, ufcProfileUrl } from "../lib";

const RESULT_COLORS = { Win: "#34d399", Loss: "#ff4d5e", Draw: "#a1a1aa", NC: "#a1a1aa" };

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const f = payload[0].payload;
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-850/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="label">{formatDate(f.Date)}</div>
      <div className="mt-1 text-sm text-zinc-200">
        <span style={{ color: RESULT_COLORS[f.Result] }} className="font-semibold">{f.Result}</span> vs {f.Opponent}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl text-white num">{f.EloAfter.toFixed(0)}</span>
        <span className="text-xs num" style={{ color: f.EloChange >= 0 ? RESULT_COLORS.Win : RESULT_COLORS.Loss }}>
          {signed(f.EloChange, 1)}
        </span>
      </div>
    </div>
  );
}

function ResultDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={3.5} fill={RESULT_COLORS[payload.Result]} stroke="#0f0f12" strokeWidth={1.5} />;
}

function Tile({ label, value, accent = "text-white" }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-3 sm:p-4">
      <div className="label">{label}</div>
      <div className={`mt-1 font-display text-3xl leading-none num ${accent}`}>{value}</div>
    </div>
  );
}

export default function FighterModal({ fighter, photos, onClose }) {
  const [history, setHistory] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    setProfile(null);
    getJSON(`/api/trends/${encodeURIComponent(fighter.Fighter)}`)
      .then((d) => !cancelled && setHistory(d))
      .catch(() => !cancelled && setHistory([]));
    getJSON(`/api/fighter/${encodeURIComponent(fighter.Fighter)}`)
      .then((d) => !cancelled && setProfile(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fighter.Fighter]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const info = { ...fighter, ...profile };
  const fights = history || [];
  const last = fights[fights.length - 1];
  const careerChange = fights.length ? last.EloAfter - fights[0].EloBefore : 0;
  const basePeak = fights.length ? Math.max(...fights.map((f) => f.EloAfter)) : null;
  const ratingLabel = profile ? "Current Elo" : fighter["Peak Elo"] != null ? "Peak Elo" : "Final Elo";
  const rating = profile?.Elo ?? fighter.Elo ?? fighter["Peak Elo"] ?? last?.EloAfter;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${fighter.Fighter} details`}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-ink-700 bg-ink-900 shadow-[0_40px_120px_-20px_rgba(229,23,47,0.25)] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-ink-700 p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blood/25 blur-[90px]" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-ink-700 bg-ink-850 text-zinc-400 transition-colors hover:border-ink-600 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative flex items-center gap-4 sm:gap-6 pr-10">
            <Avatar name={fighter.Fighter} photos={photos} size="xl" ring="ring-2 ring-blood/60" />
            <div className="min-w-0">
              <h2 className="font-display text-4xl sm:text-6xl leading-[0.9] tracking-wide text-white">{fighter.Fighter}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400">
                <StatusBadge status={info.Status} />
                {info["Weight Class"] && <span>{info["Weight Class"]}</span>}
                {info.Record && <span className="num">{info.Record}</span>}
                <a
                  href={ufcProfileUrl(fighter.Fighter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-cond text-xs font-semibold uppercase tracking-[0.14em] text-blood-light hover:text-white transition-colors"
                >
                  UFC.com ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {history === null ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-700 border-t-blood" />
            </div>
          ) : fights.length === 0 ? (
            <p className="py-20 text-center text-zinc-500">No fight history available</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile label={ratingLabel} value={rating != null ? rating.toFixed(0) : "—"} accent="text-blood-light" />
                <Tile label="Peak (base)" value={basePeak.toFixed(0)} />
                <Tile
                  label="Career change"
                  value={signed(careerChange)}
                  accent={careerChange >= 0 ? "text-emerald-400" : "text-blood-light"}
                />
                <Tile label="UFC fights" value={fights.length} />
              </div>

              <div className="mt-6 rounded-2xl border border-ink-700 bg-ink-950/60 p-3 sm:p-5">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-display text-2xl tracking-wide text-white">Elo Progression</h3>
                  <div className="flex gap-3">
                    {["Win", "Loss"].map((r) => (
                      <span key={r} className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <span className="h-2 w-2 rounded-full" style={{ background: RESULT_COLORS[r] }} />
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={fights} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#e5172f" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#e5172f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#26262d" strokeDasharray="2 6" vertical={false} />
                    <XAxis
                      dataKey="Date"
                      tickFormatter={(d) => formatDate(d, { month: "short", year: "2-digit" })}
                      stroke="#52525b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      stroke="#52525b"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[(min) => Math.floor((min - 20) / 50) * 50, (max) => Math.ceil((max + 20) / 50) * 50]}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#3a3a44", strokeDasharray: "3 3" }} />
                    <Area
                      type="monotone"
                      dataKey="EloAfter"
                      stroke="#ff4d5e"
                      strokeWidth={2.5}
                      fill="url(#eloFill)"
                      dot={<ResultDot />}
                      activeDot={{ r: 6, fill: "#fff", stroke: "#e5172f", strokeWidth: 2 }}
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="mt-2 px-1 text-xs text-zinc-500">
                  Base Elo from fight results. Leaderboard ratings also apply championship boosts and inactivity decay.
                </p>
              </div>

              <h3 className="mt-8 mb-3 font-display text-2xl tracking-wide text-white">Fight History</h3>
              <div className="space-y-2">
                {[...fights].reverse().map((f, i) => (
                  <div
                    key={`${f.Date}-${f.Opponent}`}
                    className="relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-ink-700 bg-ink-850 py-3 pl-5 pr-4 animate-fade-up"
                    style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: RESULT_COLORS[f.Result] }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-cond text-sm font-bold uppercase tracking-wider" style={{ color: RESULT_COLORS[f.Result] }}>
                          {f.Result}
                        </span>
                        <span className="truncate text-sm font-medium text-zinc-100">{f.Opponent}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-zinc-500">
                        {f.Method} · {formatDate(f.Date)} · {f.Event}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`font-display text-xl num ${f.EloChange >= 0 ? "text-emerald-400" : "text-blood-light"}`}>
                        {signed(f.EloChange, 1)}
                      </div>
                      <div className="text-xs text-zinc-500 num">
                        {f.EloBefore.toFixed(0)} → {f.EloAfter.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
