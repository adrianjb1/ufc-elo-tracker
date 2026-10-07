import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = process.env.REACT_APP_API_URL || "";

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const formatDate = (value, options = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  new Date(value).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });

function FighterAvatar({ name, photos, size }) {
  const [failed, setFailed] = useState(false);
  const photo = photos[name];
  const initials = (() => {
    const parts = name.split(' ');
    return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2)).toUpperCase();
  })();
  return (
    <div className={`${size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm"} flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden text-gray-700 font-bold`}>
      {photo && !failed ? (
        <img
          src={`/fighters/${photo}`}
          alt={name}
          className="w-full h-full object-cover object-top"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export default function App() {
  const [fighters, setFighters] = useState([]);
  const [view, setView] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFighter, setSelectedFighter] = useState(null);
  const [fightHistory, setFightHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [weightClass, setWeightClass] = useState("all");
  const [divisionGroup, setDivisionGroup] = useState("all");
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState(null);
  const [trending, setTrending] = useState(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState("");
  const [photos, setPhotos] = useState({});

  const menWeightClasses = [
    "flyweight", "bantamweight", "featherweight", "lightweight",
    "welterweight", "middleweight", "light heavyweight", "heavyweight",
  ];
  const womenWeightClasses = [
    "women's strawweight", "women's flyweight", "women's bantamweight", "women's featherweight",
  ];

  const fetchData = async (type, search = "", weightFilter = "all", resultLimit = 10, group = "all") => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (weightFilter && weightFilter !== 'all') {
        params.append('weight_class', weightFilter);
      } else if (group && group !== 'all') {
        params.append('division_group', group);
      }
      if (resultLimit) params.append('limit', resultLimit);

      const url = `${API}/api/${type}${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${type} data`);
      const data = await res.json();
      setFighters(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const getFighterUrl = (name) => `https://www.ufc.com/athlete/${slugify(name)}`;

  const openFighterDetails = async (fighter) => {
    setSelectedFighter(fighter);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/api/trends/${encodeURIComponent(fighter.Fighter)}`);
      if (!res.ok) throw new Error('Failed to fetch fight history');
      const data = await res.json();
      setFightHistory(data);
    } catch (err) {
      console.error(err);
      setFightHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const switchView = (next) => {
    if (next === view) return;
    setFighters([]);
    setLoading(true);
    setView(next);
  };

  const closeFighterDetails = () => {
    setSelectedFighter(null);
    setFightHistory([]);
  };

  const fetchTrending = async () => {
    try {
      setTrendingLoading(true);
      setTrendingError("");
      const res = await fetch(`${API}/api/trending?fights=3&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch trending data");
      const data = await res.json();
      setTrending(data);
    } catch (err) {
      console.error(err);
      setTrendingError("Failed to load trending data.");
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    if (view === "trending") {
      fetchTrending();
      return;
    }
    const debounceTimer = setTimeout(() => {
      fetchData(view, searchQuery, weightClass, limit, divisionGroup);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [view, searchQuery, weightClass, limit, divisionGroup]);

  useEffect(() => {
    fetch(`${API}/api/meta`)
      .then((res) => res.json())
      .then((data) => setMeta(data))
      .catch(() => {});
    fetch("/fighters/fighter_photos.json")
      .then((res) => res.json())
      .then((data) => setPhotos(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedFighter) return;
    const onKey = (e) => e.key === "Escape" && closeFighterDetails();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedFighter]);

  const careerChange = fightHistory.length
    ? fightHistory[fightHistory.length - 1].EloAfter - fightHistory[0].EloBefore
    : 0;

  const weightClassLabel = (value) =>
    value.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

  return (
    <div className="min-h-screen bg-white">

      <div className="flex flex-col items-center px-4 sm:px-8 pt-12 sm:pt-32 pb-16">

        <div className="mb-12 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2">
            UFC Elo Leaderboard
          </h1>
          <div className="h-1 w-24 bg-red-600 mx-auto mt-3"></div>
          <p className="text-gray-500 mt-4 text-sm">
            {view === "current"
              ? weightClass !== "all"
                ? `${weightClassLabel(weightClass)} Top ${limit}`
                : divisionGroup !== "all"
                ? `${divisionGroup === "women" ? "Women's" : "Men's"} Top ${limit}`
                : "Current Rankings"
              : view === "peak"
              ? "All-Time Peak Rankings"
              : "Biggest Elo Movers (Last 3 Fights)"}
          </p>
          {meta && (
            <p className="text-gray-400 mt-1 text-xs">
              Data last updated: {formatDate(meta.data_updated_through, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {meta && (
          <div className="mb-8 w-full max-w-4xl grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { value: meta.total_fighters.toLocaleString(), label: "Fighters Tracked" },
              { value: meta.total_fights.toLocaleString(), label: "Fights Tracked" },
              { value: meta.title_fights.toLocaleString(), label: "Title Fights Tracked" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="relative bg-white border border-gray-200 rounded-xl pt-5 pb-4 text-center shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-600"></div>
                <div className="text-xl sm:text-3xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {view !== "trending" && (
          <div className="mb-8 w-full max-w-4xl">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search fighters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                {[
                  { value: "all", label: "All" },
                  { value: "men", label: "Men's" },
                  { value: "women", label: "Women's" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setDivisionGroup(value);
                      setWeightClass("all");
                    }}
                    className={`px-3 py-2 font-medium transition-colors ${
                      divisionGroup === value
                        ? "bg-red-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={weightClass}
                onChange={(e) => setWeightClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="all">All Weight Classes</option>
                {(divisionGroup === "women"
                  ? womenWeightClasses
                  : divisionGroup === "men"
                  ? menWeightClasses
                  : [...menWeightClasses, ...womenWeightClasses]
                ).map((wc) => (
                  <option key={wc} value={wc}>{weightClassLabel(wc)}</option>
                ))}
              </select>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
              </select>
            </div>
          </div>
        )}

        <div className="mb-10 flex gap-2 text-sm">
          <button
            className={`px-3 sm:px-5 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
              view === "current"
                ? "text-red-600 underline underline-offset-4"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => switchView("current")}
          >
            Current Elo
          </button>
          <span className="text-gray-300">|</span>
          <button
            className={`px-3 sm:px-5 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
              view === "peak"
                ? "text-red-600 underline underline-offset-4"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => switchView("peak")}
          >
            Peak Elo
          </button>
          <span className="text-gray-300">|</span>
          <button
            className={`px-3 sm:px-5 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
              view === "trending"
                ? "text-red-600 underline underline-offset-4"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => switchView("trending")}
          >
            Trending
          </button>
        </div>



        {view === "trending" ? (
          trendingLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
              <p className="text-gray-500 text-sm">Loading trending fighters...</p>
            </div>
          ) : trendingError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{trendingError}</p>
            </div>
          ) : trending ? (
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "Risers", list: trending.risers, positive: true },
                { title: "Fallers", list: trending.fallers, positive: false },
              ].map(({ title, list, positive }) => (
                <div key={title} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {list.map((m, i) => (
                      <div key={m.Fighter} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{m.Fighter}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {m["Weight Class"] || "—"} · {m.Record || "—"}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-bold whitespace-nowrap ${positive ? "text-green-600" : "text-red-600"}`}>
                          {m.EloChange >= 0 ? "+" : ""}{m.EloChange.toFixed(0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null
        ) : loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
            <p className="text-gray-500 text-sm">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <>
            {fighters.length > 0 && (
              <div className="w-full max-w-4xl mb-4 text-sm text-gray-500 text-right">
                Showing {fighters.length} fighter{fighters.length !== 1 ? 's' : ''}
              </div>
            )}
            {fighters.length === 0 ? (
              <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-12 text-center border border-gray-200">
                <p className="text-gray-500">No fighters found matching your search criteria</p>
              </div>
            ) : (
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-x-auto border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fighter
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    UFC Record
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Elo Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fighters.map((f, i) => {
                  const eloValue = f.Elo ?? f["Peak Elo"] ?? 0;
                  const isTopThree = i < 3;
                  return (
                    <tr
                      key={f.Fighter}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            isTopThree
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 sm:whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <FighterAvatar name={f.Fighter} photos={photos} />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openFighterDetails(f)}
                                className="text-sm font-medium text-left text-gray-900 hover:text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                                title="View fight history and details"
                              >
                                {f.Fighter}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                              <span className="hidden sm:inline text-gray-300">|</span>
                              <a
                                href={getFighterUrl(f.Fighter)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:block text-gray-400 hover:text-red-600"
                                title="View UFC.com profile"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            </div>
                            {f.Status && (
                              <span className={`text-xs ${f.Status.startsWith("Champion") ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                                {f.Status}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {f.Record || "-"}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {eloValue.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            )}
          </>
        )}
      </div>

      {selectedFighter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeFighterDetails}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 sm:p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <FighterAvatar name={selectedFighter.Fighter} photos={photos} size="lg" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedFighter.Fighter}</h2>
                  <p className="text-gray-500 text-sm">UFC Record: {selectedFighter.Record || "N/A"}</p>
                </div>
              </div>
              <button onClick={closeFighterDetails} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {historyLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                </div>
              ) : fightHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No fight history available</p>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Total Fights</div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{fightHistory.length}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">{selectedFighter.Elo !== undefined ? "Current Elo" : "Peak Elo"}</div>
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {(selectedFighter.Elo ?? selectedFighter["Peak Elo"]).toFixed(0)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Elo Change</div>
                      <div className={`text-xl sm:text-2xl font-bold ${careerChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {careerChange > 0 ? '+' : ''}{careerChange.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8 bg-gray-50 rounded-lg p-3 sm:p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Elo Progression</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={fightHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="Date"
                          tickFormatter={(date) => formatDate(date, { month: 'short', year: '2-digit' })}
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          domain={['dataMin - 50', 'dataMax + 50']}
                          tickFormatter={(value) => Math.round(value)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                          labelFormatter={(date) => formatDate(date)}
                          formatter={(value) => [Math.round(value), 'Elo']}
                        />
                        <Line
                          type="monotone"
                          dataKey="EloAfter"
                          stroke="#dc2626"
                          strokeWidth={2}
                          dot={{ fill: '#dc2626', r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Shows base Elo from fight results. Current Elo also includes championship boosts and inactivity decay.
                    </p>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Fight History</h3>
                  <div className="space-y-3">
                    {[...fightHistory].reverse().map((fight, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                fight.Result === 'Win' ? 'bg-green-100 text-green-700' :
                                fight.Result === 'Loss' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {fight.Result}
                              </span>
                              <span className="text-sm text-gray-500">vs</span>
                              <span className="text-sm font-medium text-gray-900">{fight.Opponent}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {fight.Method} • {formatDate(fight.Date)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{fight.Event}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Elo Change</div>
                            <div className={`text-sm font-bold ${fight.EloChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {fight.EloChange >= 0 ? '+' : ''}{fight.EloChange.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {fight.EloBefore.toFixed(0)} → {fight.EloAfter.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
