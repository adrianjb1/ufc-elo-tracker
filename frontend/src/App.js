import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [fighters, setFighters] = useState([]);
  const [view, setView] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFighter, setSelectedFighter] = useState(null);
  const [fightHistory, setFightHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async (type) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`http://127.0.0.1:5000/api/${type}`);
      if (!res.ok) throw new Error(`Failed to fetch ${type} data`);
      const data = await res.json();
      setFighters(data.slice(0, 10));
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const getFighterUrl = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    return `https://www.ufc.com/athlete/${slug}`;
  };

  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getFighterPhotoUrl = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    return `/fighters/${slug}.jpg`;
  };

  const openFighterDetails = async (fighter) => {
    setSelectedFighter(fighter);
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/trends/${encodeURIComponent(fighter.Fighter)}`);
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

  const closeFighterDetails = () => {
    setSelectedFighter(null);
    setFightHistory([]);
  };

  useEffect(() => {
    fetchData(view);
  }, [view]);

  return (
    <div className="min-h-screen bg-white">

      <div className="flex flex-col items-center px-8 pt-32 pb-16">

        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            UFC Elo Leaderboard
          </h1>
          <div className="h-1 w-24 bg-red-600 mx-auto mt-3"></div>
          <p className="text-gray-500 mt-4 text-sm">
            {view === "current" ? "Current Rankings" : "All-Time Peak Rankings"}
          </p>
        </div>

        
        <div className="mb-10 flex gap-2 text-sm">
          <button
            className={`px-5 py-2 rounded-full font-medium transition-all ${
              view === "current"
                ? "text-red-600 underline underline-offset-4"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setView("current")}
          >
            Current Elo
          </button>
          <span className="text-gray-300">|</span>
          <button
            className={`px-5 py-2 rounded-full font-medium transition-all ${
              view === "peak"
                ? "text-red-600 underline underline-offset-4"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setView("peak")}
          >
            Peak Elo
          </button>
        </div>



        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
            <p className="text-gray-500 text-sm">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200" style={{willChange: 'auto', contain: 'layout style paint'}}>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fighter
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    UFC Record
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Elo Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fighters.map((f, i) => {
                  const eloValue = f.Elo || f["Peak Elo"] || 0;
                  const isTopThree = i < 3;
                  return (
                    <tr
                      key={f.Fighter}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              <img
                                src={getFighterPhotoUrl(f.Fighter)}
                                alt={f.Fighter}
                                className="w-full h-full object-cover object-top"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden w-full h-full items-center justify-center text-gray-700 font-bold text-sm">
                                {getInitials(f.Fighter)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openFighterDetails(f)}
                              className="text-sm font-medium text-gray-900 hover:text-red-600 hover:underline cursor-pointer flex items-center gap-1"
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
                            <span className="text-gray-300">|</span>
                            <a
                              href={getFighterUrl(f.Fighter)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-red-600"
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
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {f.Record || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {eloValue.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedFighter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeFighterDetails}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  <img
                    src={getFighterPhotoUrl(selectedFighter.Fighter)}
                    alt={selectedFighter.Fighter}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center text-gray-700 font-bold text-xl">
                    {getInitials(selectedFighter.Fighter)}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedFighter.Fighter}</h2>
                  <p className="text-gray-500 text-sm">UFC Record: {selectedFighter.Record || "N/A"}</p>
                </div>
              </div>
              <button onClick={closeFighterDetails} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
                ×
              </button>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                </div>
              ) : fightHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-12">No fight history available</p>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Total Fights</div>
                      <div className="text-2xl font-bold text-gray-900">{fightHistory.length}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Current Elo</div>
                      <div className="text-2xl font-bold text-red-600">
                        {(selectedFighter.Elo || selectedFighter["Peak Elo"]).toFixed(0)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-xs text-gray-500 uppercase mb-1">Elo Change</div>
                      <div className={`text-2xl font-bold ${fightHistory[fightHistory.length - 1].EloAfter - fightHistory[0].EloBefore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(fightHistory[fightHistory.length - 1].EloAfter - fightHistory[0].EloBefore).toFixed(0) > 0 ? '+' : ''}
                        {(fightHistory[fightHistory.length - 1].EloAfter - fightHistory[0].EloBefore).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Elo Progression</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={fightHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="Date"
                          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
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
                          labelFormatter={(date) => new Date(date).toLocaleDateString()}
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
                      Shows base algorithmic Elo from fight results. Current Elo includes championship status boosts (up to 1.18x for champions) and potentially other slight adjustments.
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
                              {fight.Method} • {new Date(fight.Date).toLocaleDateString()}
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
