import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Sparkline from "./Sparkline";
import { Belt } from "./Status";
import { getJSON, statusKind } from "../lib";

function Picker({ value, onPick, align }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      getJSON(`/api/fighters?limit=8&q=${encodeURIComponent(query)}`).then(setOptions).catch(() => setOptions([]));
    }, 120);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (name) => {
    onPick(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={box} className="relative">
      <input
        value={open ? query : value || ""}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && options[0] && pick(options[0])}
        placeholder="Search a fighter"
        aria-label="Pick a fighter"
        className={`mono h-11 w-full border-0 border-b-2 border-paper/40 bg-transparent px-0 text-sm text-paper placeholder:text-mute focus:border-blood focus:outline-none focus:ring-0 ${align === "right" ? "lg:text-right" : ""}`}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto border-2 border-paper bg-ink shadow-[6px_6px_0_0_#d20a11]">
          {options.map((name) => (
            <li key={name}>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => pick(name)} className="w-full px-3 py-2 text-left text-sm text-paper hover:bg-blood">
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Corner({ fighter, align, color }) {
  const right = align === "right";
  const rows = [
    ["Elo", Math.round(fighter.Base_Elo)],
    ["Record", fighter.Record || "—"],
    ["Division", fighter["Weight Class"] || "—"],
    ["UFC fights", fighter.Fights],
  ];
  return (
    <div className={`flex flex-col ${right ? "lg:items-end lg:text-right" : ""}`}>
      <div className={`flex items-end gap-4 ${right ? "lg:flex-row-reverse" : ""}`}>
        <div className={`rounded-full p-1 ${color}`}>
          <Avatar name={fighter.Fighter} photo={fighter.Photo} size="xl" tone="dark" />
        </div>
        {statusKind(fighter.Status) === "champ" && fighter.Active && (
          <span className="mono mb-2 inline-flex items-center gap-1 text-[10px] text-[#e8b54a]">
            <Belt /> Champ
          </span>
        )}
      </div>
      <div className="display mt-4 text-[44px] sm:text-[56px]">{fighter.Fighter}</div>
      {fighter.Nickname && <div className="mt-1 text-sm italic text-mute-light">“{fighter.Nickname}”</div>}
      <dl className="mt-5 w-full max-w-sm">
        {rows.map(([k, v]) => (
          <div key={k} className={`flex justify-between gap-4 border-b border-line-dark py-2 ${right ? "lg:flex-row-reverse" : ""}`}>
            <dt className="mono text-[10px] text-mute-light">{k}</dt>
            <dd className="text-sm font-semibold num">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <Sparkline values={fighter.Spark} width={160} height={40} tone="dark" />
      </div>
    </div>
  );
}

function historicalRate(p, calibration) {
  const fav = Math.max(p, 1 - p) * 100;
  const bucket = (calibration || []).find((c) => {
    const [lo, hi] = c.range.replace("%", "").split("-").map(Number);
    return fav >= lo && fav <= hi;
  });
  return bucket ? Math.round(bucket.actual * 100) : null;
}

export default function Matchup({ accuracy }) {
  const [pool, setPool] = useState([]);
  const [names, setNames] = useState([null, null]);
  const [data, setData] = useState(null);

  useEffect(() => {
    getJSON("/api/current?limit=60")
      .then((rows) => {
        setPool(rows);
        if (rows.length >= 2) setNames([rows[0].Fighter, rows[1].Fighter]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const [a, b] = names;
    if (!a || !b) return;
    let cancelled = false;
    getJSON(`/api/matchup?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`)
      .then((d) => !cancelled && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [names]);

  const randomize = () => {
    const divisions = [...new Set(pool.map((f) => f["Weight Class"]))];
    const wc = divisions[Math.floor(Math.random() * divisions.length)];
    const options = pool.filter((f) => f["Weight Class"] === wc);
    const list = options.length >= 2 ? options : pool;
    const i = Math.floor(Math.random() * list.length);
    let j = Math.floor(Math.random() * (list.length - 1));
    if (j >= i) j += 1;
    setNames([list[i].Fighter, list[j].Fighter]);
  };

  const pa = data ? data.p_a : 0.5;
  const rate = data ? historicalRate(pa, accuracy?.calibration) : null;
  const favorite = data && (pa >= 0.5 ? data.a : data.b);

  return (
    <section id="matchup" className="relative mt-24 overflow-hidden bg-ink text-paper">
      <svg className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] text-paper/[0.04]" viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <polygon points="34,12 66,12 88,34 88,66 66,88 34,88 12,66 12,34" fill="none" stroke="currentColor" strokeWidth="0.4" />
      </svg>

      <div className="relative px-4 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mono text-sm text-blood-light">Matchmaker</div>
            <h2 className="display mt-1 text-[64px] sm:text-[104px]">Tale of the tape</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setNames(([a, b]) => [b, a])} className="mono h-11 border-2 border-paper px-4 text-xs hover:bg-paper hover:text-ink transition-colors">
              Swap ⇄
            </button>
            <button onClick={randomize} className="mono h-11 bg-blood px-4 text-xs text-white hover:bg-blood-light transition-colors">
              Random fight ⟳
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-24">
          <Picker value={names[0]} onPick={(n) => setNames(([, b]) => [n, b])} />
          <Picker value={names[1]} onPick={(n) => setNames(([a]) => [a, n])} align="right" />
        </div>

        {data && (
          <>
            <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
              <Corner fighter={data.a} align="left" color="bg-blood" />
              <div className="flex flex-col items-center justify-center lg:pt-16">
                <div className="display text-[96px] text-outline-light leading-none">VS</div>
              </div>
              <Corner fighter={data.b} align="right" color="bg-paper" />
            </div>

            <div className="mt-12">
              <div className="flex items-end justify-between">
                <span className="display text-[72px] sm:text-[96px] text-blood-light num">{Math.round(pa * 100)}%</span>
                <span className="display text-[72px] sm:text-[96px] num">{Math.round((1 - pa) * 100)}%</span>
              </div>
              <div className="mt-2 flex h-4 overflow-hidden bg-paper">
                <div className="h-full bg-blood transition-[width] duration-700 ease-out" style={{ width: `${pa * 100}%` }} />
              </div>
              <p className="mono mt-4 text-[11px] text-mute-light">
                Win probability from each fighter's base Elo.
                {rate != null && favorite && ` Favorites at this gap have won ${rate}% of past UFC fights.`}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
