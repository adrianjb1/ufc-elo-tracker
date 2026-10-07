import { MEN_CLASSES, WOMEN_CLASSES, formatDate, titleCase } from "../lib";

const VIEWS = [
  { value: "current", label: "Current" },
  { value: "peak", label: "All-Time" },
  { value: "trending", label: "Trending" },
];

const TITLES = {
  current: "Current UFC Elo Rankings",
  peak: "All-Time Peak Elo Rankings",
  trending: "Biggest Elo Movers",
};

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="eyebrow block mb-1">{label}</span>
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
        className="underline-field wide appearance-none pr-8 text-sm font-extrabold uppercase cursor-pointer"
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export function TopBar({ meta }) {
  return (
    <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 sm:px-8 py-4">
      <a href="/" className="wide flex items-baseline gap-1.5 text-lg font-black uppercase tracking-tight">
        <span className="bg-blood px-1.5 text-white">UFC</span>
        <span>Elo</span>
      </a>
      {meta?.data_updated_through && (
        <div className="eyebrow flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blood animate-live-pulse" />
          <span className="hidden sm:inline">Data through</span>
          <span className="text-ink">{formatDate(meta.data_updated_through, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )}
    </div>
  );
}

export default function Header({ view, onView, search, setSearch, division, setDivision, limit, setLimit, summary }) {
  return (
    <div>
      <h1 className="wide text-[34px] leading-[0.95] sm:text-6xl font-black uppercase tracking-[-0.01em] animate-fade-up">
        {TITLES[view]}
      </h1>

      <div className="mt-8 sm:mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        {view !== "trending" ? (
          <div className="grid gap-6 sm:grid-cols-[1.6fr_1fr_0.6fr]">
            <Field label="Search">
              <div className="relative">
                <svg className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
          <p className="max-w-xl text-mute">
            Net Elo change across each active fighter's last three UFC fights.
          </p>
        )}

        <div className="flex border-b-2 border-ink lg:border-0" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              role="tab"
              aria-selected={view === v.value}
              onClick={() => onView(v.value)}
              className={`toggle flex-1 lg:flex-none ${view === v.value ? "bg-ink text-white" : "text-ink hover:bg-canvas lg:border-b-2 lg:border-ink"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <p className="eyebrow mt-6 !text-ink-soft min-h-[1rem]">{summary}</p>
    </div>
  );
}
