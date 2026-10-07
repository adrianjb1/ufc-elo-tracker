import Avatar from "./Avatar";
import { signed } from "../lib";

function Column({ title, list, up }) {
  const max = Math.max(...list.map((m) => Math.abs(m.EloChange)), 1);
  const color = up ? "text-win" : "text-blood";

  return (
    <section>
      <div className="flex items-end justify-between border-b-[3px] border-ink pb-3">
        <h2 className="display text-5xl">{title}</h2>
        <span className="eyebrow">Last 3 fights</span>
      </div>
      <ol>
        {list.map((m, i) => (
          <li
            key={m.Fighter}
            className="grid grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-4 animate-fade-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="display text-3xl num">#{i + 1}</span>
            <Avatar name={m.Fighter} photo={m.Photo} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-base font-bold">{m.Fighter}</div>
              <div className="mono truncate text-[10px] text-mute">
                {m["Weight Class"] || "—"} · {m.Record || "—"}
              </div>
              <div className="mt-2 h-[3px] bg-line">
                <div
                  className={`h-full origin-left animate-draw-x ${up ? "bg-win" : "bg-blood"}`}
                  style={{ width: `${(Math.abs(m.EloChange) / max) * 100}%`, animationDelay: `${i * 30 + 150}ms` }}
                />
              </div>
            </div>
            <span className={`display text-4xl num ${color}`}>{signed(m.EloChange)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Trending({ data }) {
  return (
    <div className="grid gap-12 md:gap-10 md:grid-cols-2">
      <Column title="Rising" list={data.risers} up />
      <Column title="Falling" list={data.fallers} up={false} />
    </div>
  );
}
