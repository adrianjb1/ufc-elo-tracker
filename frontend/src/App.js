import { useEffect, useMemo, useState } from "react";
import Header, { TopBar } from "./components/Header";
import RankingsTable from "./components/RankingsTable";
import Trending from "./components/Trending";
import Methodology from "./components/Methodology";
import Matchup from "./components/Matchup";
import { getJSON, getPage, titleCase } from "./lib";

const DEFAULT_SORT = { field: "pos", dir: "asc" };

function Loading({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-28">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink" />
      <span className="eyebrow">{label}</span>
    </div>
  );
}

function Message({ children }) {
  return <div className="border-t-2 border-ink py-24 text-center text-mute">{children}</div>;
}

export default function App() {
  const [view, setView] = useState("current");
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [expanded, setExpanded] = useState(null);

  const [page, setPage] = useState({ rows: [], total: 0 });
  const [trending, setTrending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    getJSON("/api/meta").then(setMeta).catch(() => {});
    getJSON("/api/accuracy").then(setAccuracy).catch(() => {});
    getJSON("/api/latest").then(setLatest).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setExpanded(null);

    if (view === "trending") {
      getJSON("/api/trending?fights=3&limit=10")
        .then((d) => !cancelled && setTrending(d))
        .catch(() => !cancelled && setError("Couldn't load trending fighters."))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }

    const params = new URLSearchParams({ limit });
    if (search) params.set("search", search);
    if (division === "men" || division === "women") params.set("division_group", division);
    else if (division !== "all") params.set("weight_class", division);

    const timer = setTimeout(() => {
      getPage(`/api/${view}?${params}`)
        .then((d) => !cancelled && setPage(d))
        .catch(() => !cancelled && setError("Couldn't load the rankings. Is the API running?"))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, search, division, limit]);

  const rows = useMemo(() => {
    const ranked = page.rows.map((f, i) => ({ ...f, pos: i + 1, elo: f.Elo ?? f["Peak Elo"] }));
    if (sort.field === "pos" && sort.dir === "asc") return ranked;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...ranked].sort((a, b) => ((a[sort.field] ?? -Infinity) - (b[sort.field] ?? -Infinity)) * dir);
  }, [page, sort]);

  const onSort = (field) =>
    setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: field === "pos" ? "asc" : "desc" }));

  const onView = (next) => {
    if (next === view) return;
    setPage({ rows: [], total: 0 });
    setSort(DEFAULT_SORT);
    setView(next);
  };

  const scope =
    division === "all" ? "" : division === "men" ? " men's" : division === "women" ? " women's" : ` ${titleCase(division).toLowerCase()}`;
  const summary =
    view === "trending"
      ? "Active fighters with 3+ UFC fights"
      : loading
      ? ""
      : `Showing ${rows.length} of ${page.total.toLocaleString()}${search ? " matching" : ""}${scope} ${view === "current" ? "active " : ""}fighters${
          meta?.accuracy ? ` · favorites win ${Math.round(meta.accuracy.accuracy * 100)}% of fights` : ""
        }`;

  return (
    <div className="min-h-screen">
      <TopBar meta={meta} latest={latest} />

      <main className="paper-grain mx-auto max-w-[1240px] bg-paper px-4 sm:px-10 pt-10 sm:pt-14 pb-20 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.3)]">
        <Header
          view={view}
          onView={onView}
          search={search}
          setSearch={setSearch}
          division={division}
          setDivision={setDivision}
          limit={limit}
          setLimit={setLimit}
          summary={summary}
        />

        <div className="mt-6 md:mt-4">
          {loading ? (
            <Loading label={view === "trending" ? "Finding movers" : "Loading rankings"} />
          ) : error ? (
            <Message>{error}</Message>
          ) : view === "trending" ? (
            trending && <Trending data={trending} />
          ) : rows.length === 0 ? (
            <Message>No fighters match those filters.</Message>
          ) : (
            <RankingsTable
              rows={rows}
              view={view}
              sort={sort}
              onSort={onSort}
              expanded={expanded}
              onToggle={(name) => setExpanded((cur) => (cur === name ? null : name))}
            />
          )}
        </div>

        <div className="-mx-4 sm:-mx-10">
          <Matchup accuracy={accuracy} />
        </div>

        <Methodology accuracy={accuracy} />
      </main>

      <footer className="mono mx-auto flex max-w-[1240px] flex-col justify-between gap-2 px-4 py-8 text-[10px] text-mute sm:flex-row sm:px-10">
        <span>Fight data from ufcstats.com. Not affiliated with the UFC.</span>
        {meta?.total_fights != null && <span className="num">{meta.total_fights.toLocaleString()} fights · {meta.total_fighters.toLocaleString()} fighters · {meta.title_fights} title fights</span>}
      </footer>
    </div>
  );
}
