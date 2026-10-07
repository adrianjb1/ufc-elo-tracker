import Avatar from "./Avatar";
import { signed } from "../lib";

function Column({ title, list, up, photos, onOpen }) {
  const max = Math.max(...list.map((m) => Math.abs(m.EloChange)), 1);
  const color = up ? "text-emerald-400" : "text-blood-light";
  const bar = up ? "from-emerald-600 to-emerald-400" : "from-blood-dark to-blood";

  return (
    <div className="panel overflow-hidden animate-fade-up" style={{ animationDelay: up ? "0ms" : "80ms" }}>
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className={`h-5 w-5 ${color} ${up ? "" : "rotate-180"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M4 17l6-6 4 4 6-6M14 9h6v6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="font-display text-2xl tracking-wide text-white">{title}</h3>
        </div>
        <span className="label">Last 3 fights</span>
      </div>
      <div>
        {list.map((m, i) => (
          <button
            key={m.Fighter}
            onClick={() => onOpen(m)}
            className="group grid w-full grid-cols-[1.75rem_auto_1fr_auto] items-center gap-3 border-b border-ink-800 px-5 py-3 text-left last:border-0 hover:bg-ink-850 transition-colors animate-fade-up"
            style={{ animationDelay: `${i * 35 + 120}ms` }}
          >
            <span className="font-display text-xl text-zinc-600 num">{i + 1}</span>
            <Avatar name={m.Fighter} photos={photos} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">{m.Fighter}</div>
              <div className="truncate text-xs text-zinc-500">
                {m["Weight Class"] || "—"} · {m.Record || "—"}
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className={`h-full origin-left rounded-full bg-gradient-to-r ${bar} animate-grow-x`}
                  style={{ width: `${(Math.abs(m.EloChange) / max) * 100}%`, animationDelay: `${i * 35 + 250}ms` }}
                />
              </div>
            </div>
            <span className={`font-display text-2xl ${color} num`}>{signed(m.EloChange)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Trending({ data, photos, onOpen }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Column title="Rising" list={data.risers} up photos={photos} onOpen={onOpen} />
      <Column title="Falling" list={data.fallers} up={false} photos={photos} onOpen={onOpen} />
    </div>
  );
}
