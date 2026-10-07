import { useRef } from "react";
import Avatar from "./Avatar";
import Status from "./Status";
import Sparkline from "./Sparkline";
import FighterDetails from "./FighterDetails";
import { formatDate, signed, shortClass } from "../lib";

const GRID = "lg:grid-cols-[5rem_minmax(0,1fr)_8rem_9.5rem_12rem_7.5rem]";

function SortHeader({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`eyebrow flex items-center gap-1 transition-colors hover:text-ink ${active ? "!text-ink underline decoration-2 underline-offset-4" : ""}`}
    >
      {label}
      <span aria-hidden="true">{active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function Change({ value }) {
  if (value == null) return <span className="text-mute-light">—</span>;
  const rounded = Math.round(value);
  const color = rounded > 0 ? "text-win" : rounded < 0 ? "text-blood" : "text-mute";
  return <span className={`mono text-[13px] num ${color}`}>{rounded === 0 ? "±0" : signed(rounded)}</span>;
}

function DivisionTag({ fighter }) {
  return (
    <div className="flex items-center">
      <span className="tag">{shortClass(fighter["Weight Class"]) || "—"}</span>
      <span className="tag -ml-[2px] bg-ink text-paper num">#{fighter.Division_Rank}</span>
    </div>
  );
}

function Row({ fighter, view, open, onToggle, index }) {
  const opened = useRef(false);
  if (open) opened.current = true;
  const elo = view === "peak" ? fighter["Peak Elo"] : fighter.Elo;
  const sub = fighter.Nickname ? `“${fighter.Nickname}”` : fighter.Record;

  return (
    <div className={`border-b border-line transition-colors ${open ? "bg-canvas/50" : "hover:bg-canvas/40"}`}>
      <div
        className={`grid grid-cols-[3rem_minmax(0,1fr)_auto] ${GRID} items-center gap-x-3 gap-y-3 px-1 py-4 lg:gap-x-5 lg:px-4 lg:py-5 animate-fade-up`}
        style={{ animationDelay: `${Math.min(index, 15) * 25}ms` }}
      >
        <div className={`display text-[40px] lg:text-[56px] num ${fighter.pos === 1 ? "text-blood" : ""}`}>{fighter.pos}</div>

        <button onClick={onToggle} className="group flex min-w-0 items-center gap-3 text-left lg:gap-4" aria-expanded={open}>
          <Avatar name={fighter.Fighter} photo={fighter.Photo} />
          <div className="min-w-0 overflow-hidden">
            <div className="line-clamp-2 break-words text-[17px] font-bold leading-tight transition-colors group-hover:text-blood lg:truncate lg:text-xl">
              {fighter.Fighter}
            </div>
            <div className="mt-1 flex flex-col items-start gap-0.5">
              {sub && <span className="max-w-full truncate text-[13px] italic text-mute">{sub}</span>}
              <Status status={fighter.Status} streak={fighter.Title_Streak} />
            </div>
          </div>
        </button>

        <div className="text-right lg:text-left">
          <div className="display text-[34px] lg:text-[42px] num">{Math.round(elo)}</div>
          <div className="mono mt-1 whitespace-nowrap text-[10px] text-mute">
            <span className="hidden sm:inline">{fighter.Tier} · </span>Top {fighter.Top_Pct}%
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-1">
          <Sparkline values={fighter.Spark} />
          {view === "peak" ? <span className="mono text-[11px] text-mute num">{fighter.Record}</span> : <Change value={fighter.Last_Change} />}
        </div>

        <div className="hidden lg:block"><DivisionTag fighter={fighter} /></div>

        <div className="hidden lg:block">
          <div className="text-[15px] font-bold num">{fighter.Fights} fights</div>
          {fighter.Last_Fight && <div className="mono mt-0.5 text-[10px] text-mute num">{formatDate(fighter.Last_Fight, { year: "numeric", month: "short", day: "numeric" })}</div>}
          <button onClick={onToggle} className="link-plus mt-2" aria-expanded={open}>
            Details {open ? "−" : "+"}
          </button>
        </div>

        <div className="col-span-3 flex items-center justify-between gap-3 lg:hidden">
          <DivisionTag fighter={fighter} />
          <div className="flex items-center gap-3">
            <Sparkline values={fighter.Spark} width={64} height={24} />
            <button onClick={onToggle} className="link-plus" aria-expanded={open}>
              {open ? "Close −" : "More +"}
            </button>
          </div>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">{opened.current && <FighterDetails fighter={fighter} />}</div>
      </div>
    </div>
  );
}

export default function RankingsTable({ rows, view, sort, onSort, expanded, onToggle }) {
  return (
    <div className="border-t-[3px] border-ink lg:border-t-0">
      <div className={`hidden lg:grid ${GRID} gap-x-5 border-b-[3px] border-ink px-4 py-4`}>
        <SortHeader label="Rank" field="pos" sort={sort} onSort={onSort} />
        <span className="eyebrow">Fighter</span>
        <SortHeader label={view === "peak" ? "Peak" : "Elo"} field="elo" sort={sort} onSort={onSort} />
        {view === "peak" ? <span className="eyebrow">Last 10</span> : <SortHeader label="Form" field="Last_Change" sort={sort} onSort={onSort} />}
        <span className="eyebrow">Division</span>
        <SortHeader label="Fights" field="Fights" sort={sort} onSort={onSort} />
      </div>
      {rows.map((f, i) => (
        <Row key={f.Fighter} fighter={f} view={view} index={i} open={expanded === f.Fighter} onToggle={() => onToggle(f.Fighter)} />
      ))}
    </div>
  );
}
