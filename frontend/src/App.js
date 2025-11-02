import React, { useState, useEffect } from "react";

export default function App() {
  const [fighters, setFighters] = useState([]);
  const [view, setView] = useState("current");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async (type) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`http://127.0.0.1:5000/api/${type}`);
      if (!res.ok) throw new Error(`Failed to fetch ${type} data`);
      const data = await res.json();
      setFighters(data.slice(0, 10)); // top 10 only
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(view);
  }, [view]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">UFC Elo Leaderboard</h1>

      <div className="flex gap-3 mb-6">
        <button
          className={`px-4 py-2 rounded-lg ${
            view === "current" ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          onClick={() => setView("current")}
        >
          Current
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            view === "peak" ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
          }`}
          onClick={() => setView("peak")}
        >
          Peak
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading leaderboard...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <table className="border-collapse border border-gray-700 w-full max-w-3xl text-left">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-700 px-4 py-2">#</th>
              <th className="border border-gray-700 px-4 py-2">Fighter</th>
              <th className="border border-gray-700 px-4 py-2">UFC Record</th>
              <th className="border border-gray-700 px-4 py-2">Elo</th>
            </tr>
          </thead>
          <tbody>
            {fighters.map((f, i) => {
              const eloValue = f.Elo || f["Peak Elo"] || 0;
              return (
                <tr
                  key={f.Fighter}
                  className="hover:bg-gray-800 transition-colors duration-150"
                >
                  <td className="border border-gray-700 px-4 py-2">{i + 1}</td>
                  <td className="border border-gray-700 px-4 py-2">{f.Fighter}</td>
                  <td className="border border-gray-700 px-4 py-2">{f.Record || "-"}</td>
                  <td className="border border-gray-700 px-4 py-2">
                    {eloValue.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
