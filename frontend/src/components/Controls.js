import { MEN_CLASSES, WOMEN_CLASSES, titleCase } from "../lib";

const VIEWS = [
  { value: "current", label: "Current" },
  { value: "peak", label: "All-Time Peak" },
  { value: "trending", label: "Trending" },
];

export function ViewTabs({ view, onChange }) {
  const index = VIEWS.findIndex((v) => v.value === view);
  return (
    <div className="relative grid grid-cols-3 rounded-full border border-ink-700 bg-ink-900 p-1 w-full max-w-md mx-auto">
      <div
        className="absolute top-1 bottom-1 left-1 rounded-full bg-blood shadow-[0_0_24px_-4px_rgba(229,23,47,0.7)] transition-transform duration-300 ease-out"
        style={{ width: "calc((100% - 0.5rem) / 3)", transform: `translateX(${index * 100}%)` }}
      />
      {VIEWS.map((v) => (
        <button
          key={v.value}
          onClick={() => onChange(v.value)}
          className={`relative z-10 rounded-full py-2 font-cond text-sm font-semibold uppercase tracking-[0.12em] transition-colors ${
            view === v.value ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function Chevron() {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

export function Filters({ search, setSearch, group, setGroup, weightClass, setWeightClass, limit, setLimit }) {
  const classes = group === "women" ? WOMEN_CLASSES : group === "men" ? MEN_CLASSES : [...MEN_CLASSES, ...WOMEN_CLASSES];

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <div className="relative flex-1">
        <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search fighters"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field w-full pl-11"
          aria-label="Search fighters"
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 sm:flex">
        <div className="col-span-2 flex h-11 rounded-xl border border-ink-700 bg-ink-850 p-1">
          {[
            { value: "all", label: "All" },
            { value: "men", label: "Men" },
            { value: "women", label: "Women" },
          ].map((g) => (
            <button
              key={g.value}
              onClick={() => {
                setGroup(g.value);
                setWeightClass("all");
              }}
              className={`flex-1 sm:flex-none rounded-lg px-3 font-cond text-sm font-semibold uppercase tracking-[0.1em] transition-colors ${
                group === g.value ? "bg-ink-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="relative sm:flex-1 lg:flex-none">
          <select
            value={weightClass}
            onChange={(e) => setWeightClass(e.target.value)}
            className="field w-full lg:w-52 appearance-none pr-9"
            aria-label="Weight class"
          >
            <option value="all">All divisions</option>
            {classes.map((wc) => (
              <option key={wc} value={wc}>{titleCase(wc)}</option>
            ))}
          </select>
          <Chevron />
        </div>

        <div className="relative">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="field w-28 appearance-none pr-9"
            aria-label="Number of results"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>
    </div>
  );
}
