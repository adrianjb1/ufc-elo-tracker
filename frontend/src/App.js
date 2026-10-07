import { useCallback, useEffect, useState } from "react";
import Hero from "./components/Hero";
import { Filters, ViewTabs } from "./components/Controls";
import Leaderboard from "./components/Leaderboard";
import Trending from "./components/Trending";
import FighterModal from "./components/FighterModal";
import { getJSON, statusKind, titleCase } from "./lib";

const HOW_IT_WORKS = [
  {
    title: "Elo, fight by fight",
    body: "Everyone starts at 1000. Beat a higher-rated opponent and you take more of their points, the same way chess ratings work.",
  },
  {
    title: "Context matters",
    body: "Title fights, finishes, main events, and strength of schedule all scale how much a result moves the needle. Sustained title defenses compound.",
  },
  {
    title: "Recency rules",
    body: "Inactivity decays current ratings, and champions get a boost while they hold the belt. Peak ratings capture each fighter's best-ever form.",
  },
];

function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-700 border-t-blood" />
      <p className="label">{label}</p>
    </div>
  );
}

function Empty({ children }) {
  return <div className="panel py-20 text-center text-zinc-500">{children}</div>;
}

export default function App() {
  const [view, setView] = useState("current");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [weightClass, setWeightClass] = useState("all");
  const [limit, setLimit] = useState(25);

  const [fighters, setFighters] = useState([]);
  const [trending, setTrending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [meta, setMeta] = useState(null);
  const [champions, setChampions] = useState([]);
  const [photos, setPhotos] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getJSON("/api/meta").then(setMeta).catch(() => {});
    getJSON("/api/current?limit=60")
      .then((d) => setChampions(d.filter((f) => statusKind(f.Status) === "champ")))
      .catch(() => {});
    fetch("/fighters/fighter_photos.json")
      .then((r) => r.json())
      .then(setPhotos)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    if (view === "trending") {
      getJSON("/api/trending?fights=3&limit=10")
        .then((d) => !cancelled && setTrending(d))
        .catch(() => !cancelled && setError("Couldn't load trending fighters."))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (weightClass !== "all") params.append("weight_class", weightClass);
    else if (group !== "all") params.append("division_group", group);
    params.append("limit", limit);

    const timer = setTimeout(() => {
      getJSON(`/api/${view}?${params}`)
        .then((d) => !cancelled && setFighters(d))
        .catch(() => !cancelled && setError("Couldn't load the leaderboard. Is the API running?"))
        .finally(() => !cancelled && setLoading(false));
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, search, group, weightClass, limit]);

  const switchView = (next) => {
    if (next === view) return;
    setFighters([]);
    setView(next);
  };

  const closeModal = useCallback(() => setSelected(null), []);

  const heading =
    view === "trending"
      ? "Biggest Movers"
      : weightClass !== "all"
      ? titleCase(weightClass)
      : group === "women"
      ? "Women's Pound-for-Pound"
      : group === "men"
      ? "Men's Pound-for-Pound"
      : view === "peak"
      ? "All-Time Greatest"
      : "Pound-for-Pound";

  return (
    <div className="min-h-screen">
      <Hero meta={meta} champions={champions} />

      <main className="mx-auto max-w-5xl px-4 pb-24">
        <div className="sm:sticky top-0 z-30 -mx-4 px-4 pt-6 pb-4 bg-ink-950/85 backdrop-blur-lg">
          <ViewTabs view={view} onChange={switchView} />
          {view !== "trending" && (
            <div className="mt-4">
              <Filters
                search={search}
                setSearch={setSearch}
                group={group}
                setGroup={setGroup}
                weightClass={weightClass}
                setWeightClass={setWeightClass}
                limit={limit}
                setLimit={setLimit}
              />
            </div>
          )}
        </div>

        <div className="mt-6 mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="label !text-blood">{view === "peak" ? "All-time peak" : view === "trending" ? "Momentum" : "Current rankings"}</div>
            <h2 className="mt-1 font-display text-4xl sm:text-5xl leading-none tracking-wide text-white">{heading}</h2>
          </div>
          {view !== "trending" && !loading && fighters.length > 0 && (
            <span className="label num">{fighters.length} fighters</span>
          )}
        </div>

        {loading ? (
          <Spinner label={view === "trending" ? "Finding movers" : "Loading rankings"} />
        ) : error ? (
          <Empty>{error}</Empty>
        ) : view === "trending" ? (
          trending && <Trending data={trending} photos={photos} onOpen={setSelected} />
        ) : fighters.length === 0 ? (
          <Empty>No fighters match those filters.</Empty>
        ) : (
          <Leaderboard fighters={fighters} photos={photos} onOpen={setSelected} showPodium={!search} />
        )}

        <section className="mt-24">
          <div className="label !text-blood">Methodology</div>
          <h2 className="mt-1 font-display text-4xl tracking-wide text-white">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.title} className="panel p-6 transition-colors hover:border-ink-600">
                <div className="font-display text-5xl leading-none text-outline">0{i + 1}</div>
                <h3 className="mt-3 font-cond text-lg font-bold uppercase tracking-wide text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-800 py-8 text-center text-xs text-zinc-600">
        Fight data from ufcstats.com · Not affiliated with the UFC
      </footer>

      {selected && <FighterModal fighter={selected} photos={photos} onClose={closeModal} />}
    </div>
  );
}
