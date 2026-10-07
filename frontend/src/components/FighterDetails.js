import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, getJSON, signed, ufcProfileUrl } from "../lib";

const RESULT_STYLE = {
  Win: "bg-ink text-white",
  Loss: "bg-blood text-white",
  Draw: "bg-line text-ink",
  NC: "bg-line text-ink",
};

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const f = payload[0].payload;
  return (
    <div className="border-2 border-ink bg-paper px-3 py-2 shadow-[4px_4px_0_0_#0b0b0c]">
      <div className="eyebrow">{formatDate(f.Date)}</div>
      <div className="mt-1 text-sm font-bold">
        {f.Result} vs {f.Opponent}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="display text-3xl num">{Math.round(f.EloAfter)}</span>
        <span className={`text-xs font-bold num ${f.EloChange >= 0 ? "text-win" : "text-blood"}`}>{signed(f.EloChange, 1)}</span>
      </div>
    </div>
  );
}

function ResultDot({ cx, cy, payload }) {
  if (cx == null || cy == null) return null;
  const loss = payload.Result === "Loss";
  return <circle cx={cx} cy={cy} r={loss ? 4 : 3} fill={loss ? "#d20a11" : "#0b0b0c"} stroke="#fff" strokeWidth={1.5} />;
}

function Stat({ label, children }) {
  return (
    <div className="border-l-2 border-ink pl-3">
      <div className="eyebrow">{label}</div>
      <div className="display mt-1 text-[34px] num">{children}</div>
    </div>
  );
}

export default function FighterDetails({ fighter }) {
  const [fights, setFights] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getJSON(`/api/trends/${encodeURIComponent(fighter.Fighter)}`)
      .then((d) => !cancelled && setFights(d))
      .catch(() => !cancelled && setFights([]));
    return () => {
      cancelled = true;
    };
  }, [fighter.Fighter]);

  if (fights === null) {
    return (
      <div className="flex items-center gap-3 px-4 py-10">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
        <span className="eyebrow">Loading fight history</span>
      </div>
    );
  }

  if (!fights.length) return <p className="px-4 py-10 text-mute">No fight history available.</p>;

  const last = fights[fights.length - 1];
  const basePeak = Math.max(...fights.map((f) => f.EloAfter));
  const career = last.EloAfter - fights[0].EloBefore;
  const recent = [...fights].reverse().slice(0, 6);
  const series = fights.map((f) => ({ ...f, ts: Date.parse(f.Date) }));
  const firstYear = new Date(series[0].ts).getUTCFullYear() + 1;
  const lastYear = new Date(series[series.length - 1].ts).getUTCFullYear();
  const step = Math.max(1, Math.ceil((lastYear - firstYear + 1) / 8));
  const yearTicks = [];
  for (let y = firstYear; y <= lastYear; y += step) yearTicks.push(Date.UTC(y, 0, 1));

  return (
    <div className="grid gap-8 px-1 md:px-4 pb-8 pt-2 lg:grid-cols-[1.35fr_1fr]">
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Record">{fighter.Record || "—"}</Stat>
          <Stat label="Peak (base)">{Math.round(basePeak)}</Stat>
          <Stat label="Career">
            <span className={career >= 0 ? "text-win" : "text-blood"}>{signed(career)}</span>
          </Stat>
          <Stat label="UFC debut">{formatDate(fights[0].Date, { year: "numeric" })}</Stat>
        </div>

        <div className="mt-6 border-2 border-ink bg-paper p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow !text-ink">Elo progression</span>
            <span className="flex items-center gap-3 text-[11px] font-bold text-mute">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink" />Win</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blood" />Loss</span>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${fighter.Fighter.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b0b0c" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#0b0b0c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#dcd6ca" vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={yearTicks}
                tickFormatter={(d) => new Date(d).getUTCFullYear()}
                stroke="#6f6f74"
                tick={{ fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#0b0b0c", strokeWidth: 2 }}
              />
              <YAxis
                stroke="#6f6f74"
                tick={{ fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                domain={[(min) => Math.floor((min - 20) / 50) * 50, (max) => Math.ceil((max + 20) / 50) * 50]}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#0b0b0c", strokeDasharray: "3 3" }} />
              <Area
                type="monotone"
                dataKey="EloAfter"
                stroke="#0b0b0c"
                strokeWidth={2.5}
                fill={`url(#fill-${fighter.Fighter.replace(/\W/g, "")})`}
                dot={<ResultDot />}
                activeDot={{ r: 6, fill: "#d20a11", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-mute">
          Base Elo from fight results. Leaderboard ratings also apply championship boosts and inactivity decay.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between border-b-2 border-ink pb-2">
          <span className="eyebrow !text-ink">Recent fights</span>
          <a href={ufcProfileUrl(fighter.Fighter)} target="_blank" rel="noopener noreferrer" className="link-plus">
            UFC.com ↗
          </a>
        </div>
        <ul>
          {recent.map((f) => (
            <li key={`${f.Date}-${f.Opponent}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5">
              <span className={`mono flex h-6 items-center justify-center text-[10px] ${RESULT_STYLE[f.Result]}`}>
                {f.Result === "NC" ? "NC" : f.Result[0]}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{f.Opponent}</div>
                <div className="mono truncate text-[10px] text-mute">
                  {f.Method} · {formatDate(f.Date, { month: "short", year: "numeric" })}
                </div>
              </div>
              <span className={`mono text-[13px] num ${f.EloChange >= 0 ? "text-win" : "text-blood"}`}>
                {signed(f.EloChange)}
              </span>
            </li>
          ))}
        </ul>
        {fights.length > recent.length && (
          <p className="eyebrow mt-3">+ {fights.length - recent.length} earlier UFC fights</p>
        )}
      </div>
    </div>
  );
}
