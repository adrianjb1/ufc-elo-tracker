from flask import Flask, jsonify, send_from_directory, abort, request
from flask_cors import CORS
import os, json
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
BUILD_DIR = os.path.join(BASE_DIR, "frontend", "build")
RETIREMENT_DAYS = 730

app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/api/*": {"origins": os.environ.get("CORS_ORIGINS", "*").split(",")}})

_cache = {}

def load(name, reader):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        abort(404, description="Data not available")
    mtime = os.path.getmtime(path)
    cached = _cache.get(name)
    if cached and cached[0] == mtime:
        return cached[1]
    data = reader(path)
    _cache[name] = (mtime, data)
    return data

def read_json(path):
    with open(path) as f:
        return json.load(f)

def read_fights(path):
    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    return df.sort_values("Date", kind="stable").reset_index(drop=True)

def current_data():
    return load("current_elo_2.0.json", read_json)

def peak_data():
    return load("peak_elo_2.0.json", read_json)

def fights_with_elo():
    return load("fights_with_elo_2.0.csv", read_fights)

def filter_leaderboard(data):
    search_query = request.args.get('search', '').lower()
    weight_class = request.args.get('weight_class', '').lower()
    division_group = request.args.get('division_group', '').lower()
    limit = request.args.get('limit', type=int)

    if search_query:
        data = [f for f in data if search_query in f["Fighter"].lower()]

    if weight_class and weight_class != 'all':
        data = [f for f in data if (f.get("Weight Class") or "").lower() == weight_class]
    elif division_group == 'women':
        data = [f for f in data if (f.get("Weight Class") or "").lower().startswith("women's")]
    elif division_group == 'men':
        data = [f for f in data if not (f.get("Weight Class") or "").lower().startswith("women's")]

    if limit and limit > 0:
        data = data[:limit]

    return data

@app.route("/api/current")
def get_current():
    return jsonify(filter_leaderboard(current_data()))

@app.route("/api/peak")
def get_peak():
    return jsonify(filter_leaderboard(peak_data()))

@app.route("/api/fighter/<string:name>")
def get_fighter(name):
    results = [f for f in current_data() if f["Fighter"].lower() == name.lower()]
    if not results:
        abort(404, description=f"Fighter not found: {name}")
    return jsonify(results[0])

@app.route("/api/meta")
def get_meta():
    df = fights_with_elo()
    fighters = set(df["Fighter 1"]) | set(df["Fighter 2"])
    accuracy = load("model_accuracy.json", read_json) if os.path.exists(os.path.join(DATA_DIR, "model_accuracy.json")) else {}
    return jsonify({
        "data_updated_through": int(df["Date"].max().timestamp() * 1000),
        "total_fighters": len(fighters),
        "total_fights": len(df),
        "title_fights": int((df["Is_Title_Fight"] == True).sum()),
        "accuracy": accuracy.get("experienced"),
    })

@app.route("/api/accuracy")
def get_accuracy():
    return jsonify(load("model_accuracy.json", read_json))

@app.route("/api/trending")
def get_trending():
    n_fights = max(1, request.args.get("fights", default=3, type=int))
    limit = request.args.get("limit", default=10, type=int)

    df = fights_with_elo()
    today = df["Date"].max()

    f1 = df[["Date", "Fighter 1", "Fighter1_Elo_Start", "Fighter1_Elo_End"]].rename(
        columns={"Fighter 1": "Fighter", "Fighter1_Elo_Start": "Before", "Fighter1_Elo_End": "After"})
    f2 = df[["Date", "Fighter 2", "Fighter2_Elo_Start", "Fighter2_Elo_End"]].rename(
        columns={"Fighter 2": "Fighter", "Fighter2_Elo_Start": "Before", "Fighter2_Elo_End": "After"})
    long = pd.concat([f1, f2]).sort_index(kind="stable")

    current = {f["Fighter"]: f for f in current_data()}

    movers = []
    for fighter, grp in long.groupby("Fighter", sort=False):
        if len(grp) < n_fights or fighter not in current:
            continue
        if (today - grp.iloc[-1]["Date"]).days >= RETIREMENT_DAYS:
            continue
        last_n = grp.tail(n_fights)
        before, after = float(last_n.iloc[0]["Before"]), float(last_n.iloc[-1]["After"])
        info = current[fighter]
        movers.append({
            "Fighter": fighter,
            "EloBefore": before,
            "EloAfter": after,
            "EloChange": after - before,
            "FightsCounted": n_fights,
            "Weight Class": info.get("Weight Class"),
            "Record": info.get("Record"),
        })

    risers = sorted(movers, key=lambda m: m["EloChange"], reverse=True)[:limit]
    fallers = sorted(movers, key=lambda m: m["EloChange"])[:limit]
    return jsonify({"risers": risers, "fallers": fallers})

@app.route("/api/trends/<string:name>")
def get_trends(name):
    df = fights_with_elo()
    key = name.lower()
    rows = df[(df["Fighter 1"].str.lower() == key) | (df["Fighter 2"].str.lower() == key)]

    result = []
    for _, row in rows.iterrows():
        is_f1 = row["Fighter 1"].lower() == key
        me, opp = ("1", "2") if is_f1 else ("2", "1")
        before, after = float(row[f"Fighter{me}_Elo_Start"]), float(row[f"Fighter{me}_Elo_End"])
        if row["Winner"] == row[f"Fighter {me}"]:
            outcome = "Win"
        elif row["Winner"] == row[f"Fighter {opp}"]:
            outcome = "Loss"
        elif str(row["Winner"]).lower() == "draw":
            outcome = "Draw"
        else:
            outcome = "NC"
        result.append({
            "Date": row["Date"].strftime("%Y-%m-%d") if pd.notna(row["Date"]) else None,
            "Opponent": row[f"Fighter {opp}"],
            "Result": outcome,
            "Method": row["method"],
            "Event": row["Event"],
            "EloBefore": before,
            "EloAfter": after,
            "EloChange": after - before,
        })
    return jsonify(result)

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify(error=e.description), 404
    return serve_frontend("")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if not os.path.isdir(BUILD_DIR):
        return "Elo Tracker API is running."
    if path and os.path.exists(os.path.join(BUILD_DIR, path)):
        return send_from_directory(BUILD_DIR, path)
    return send_from_directory(BUILD_DIR, "index.html")

if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG") == "1")
