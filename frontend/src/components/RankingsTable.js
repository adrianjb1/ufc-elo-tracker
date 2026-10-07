import { useRef } from "react";
import Avatar from "./Avatar";
import Status from "./Status";
import FighterDetails from "./FighterDetails";
import { formatDate, signed, shortClass } from "../lib";

const GRID = {
  current: "lg:grid-cols-[4.5rem_minmax(0,1fr)_10rem_13rem_5.5rem_8.5rem]",
  peak: "lg:grid-cols-[4.5rem_minmax(0,1fr)_10rem_13rem_6rem_8.5rem]",
};

function SortHeader({ label, field, sort, onSort, className = "" }) {
  const active = sort.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`eyebrow flex items-center gap-1 hover:text-ink transition-colors ${active ? "!text-ink underline underline-offset-4 decoration-2" : ""} ${className}`}
    >
      {label}
      <span aria-hidden="true" className="text-[10px]">{active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function Change({ value }) {
  if (value == null) return <span className="text-mute-light">—</span>;
  const rounded = Math.round(value);
  const color = rounded > 0 ? "text-win" : rounded < 0 ? "text-blood" : "text-mute";
  return <span className={`wide font-extrabold num ${color}`}>{rounded === 0 ? "0" : signed(rounded)}</span>;
}

function DivisionTag({ fighter }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="tag">{shortClass(fighter["Weight Class"]) || "—"}</span>
      <span className="tag !border-ink bg-ink text-white num">#{fighter.Division_Rank}</span>
    </div>
  );
}

function Row({ fighter, view, open, onToggle, index }) {
  const opened = useRef(false);
  if (open) opened.current = true;
  const elo = view === "peak" ? fighter["Peak Elo"] : fighter.Elo;
  const sub = fighter.Nickname || fighter.Record;

  return (
    <div className={`border-b border-line transition-colors ${open ? "bg-canvas/60" : "hover:bg-canvas/50"}`}>
      <div
        className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] ${GRID[view]} items-center gap-x-3 lg:gap-x-5 gap-y-3 px-1 lg:px-4 py-4 lg:py-6 animate-fade-up`}
        style={{ animationDelay: `${Math.min(index, 15) * 25}ms` }}
      >
        <div className="wide text-xl lg:text-[28px] font-black num">#{fighter.pos}</div>

        <button onClick={onToggle} className="group flex min-w-0 items-center gap-3 lg:gap-4 text-left" aria-expanded={open}>
          <Avatar name={fighter.Fighter} photo={fighter.Photo} />
          <div className="min-w-0 overflow-hidden">
            <div className="line-clamp-2 break-words text-[17px] lg:truncate lg:text-[22px] font-extrabold leading-tight group-hover:text-blood transition-colors">
              {fighter.Fighter}
            </div>
            <div className="mt-0.5 flex flex-col items-start gap-0.5 lg:flex-row lg:items-center lg:gap-2.5">
              {sub && <span className="wide max-w-full truncate text-[11px] font-bold uppercase tracking-[0.04em] text-mute num">{sub}</span>}
              <Status status={fighter.Status} />
            </div>
          </div>
        </button>

        <div className="text-right lg:text-left">
          <div className="wide text-2xl lg:text-[30px] font-black leading-none num">{Math.round(elo)}</div>
          <div className="wide mt-1.5 text-[10px] lg:text-[11px] font-extrabold uppercase tracking-[0.04em] text-mute whitespace-nowrap">
            <span className="hidden sm:inline">{fighter.Tier} <span className="text-line">|</span> </span>Top {fighter.Top_Pct}%
          </div>
        </div>

        <div className="hidden lg:block"><DivisionTag fighter={fighter} /></div>

        <div className="hidden lg:block text-lg">
          {view === "peak" ? <span className="wide text-base font-bold num">{fighter.Record}</span> : <Change value={fighter.Last_Change} />}
        </div>

        <div className="hidden lg:block">
          <div className="text-[17px] font-extrabold num">{fighter.Fights} fights</div>
          {fighter.Last_Fight && <div className="wide mt-0.5 text-xs font-bold text-mute num">{formatDate(fighter.Last_Fight, { year: "numeric", month: "2-digit", day: "2-digit" })}</div>}
          <button onClick={onToggle} className="link-plus mt-2" aria-expanded={open}>
            Details {open ? "−" : "+"}
          </button>
        </div>

        <div className="col-span-3 flex items-center justify-between gap-3 lg:hidden">
          <DivisionTag fighter={fighter} />
          <div className="flex items-center gap-4">
            {view !== "peak" && <Change value={fighter.Last_Change} />}
            <button onClick={onToggle} className="link-plus" aria-expanded={open}>
              Details {open ? "−" : "+"}
            </button>
          </div>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {opened.current && <FighterDetails fighter={fighter} />}
        </div>
      </div>
    </div>
  );
}

export default function RankingsTable({ rows, view, sort, onSort, expanded, onToggle }) {
  return (
    <div className="border-t-2 border-ink lg:border-t-0">
      <div className={`hidden lg:grid ${GRID[view]} gap-x-5 border-b-[3px] border-ink px-4 py-5`}>
        <SortHeader label="Rank" field="pos" sort={sort} onSort={onSort} />
        <span className="eyebrow">Fighter</span>
        <SortHeader label={view === "peak" ? "Peak Elo" : "Elo"} field="elo" sort={sort} onSort={onSort} />
        <span className="eyebrow">Division</span>
        {view === "peak" ? <span className="eyebrow">Record</span> : <SortHeader label="Last" field="Last_Change" sort={sort} onSort={onSort} />}
        <SortHeader label="Fights" field="Fights" sort={sort} onSort={onSort} />
      </div>
      {rows.map((f, i) => (
        <Row
          key={f.Fighter}
          fighter={f}
          view={view}
          index={i}
          open={expanded === f.Fighter}
          onToggle={() => onToggle(f.Fighter)}
        />
      ))}
    </div>
  );
}
