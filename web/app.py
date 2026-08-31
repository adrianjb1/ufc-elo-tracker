from flask import Flask, jsonify, send_from_directory, abort, request
import os, json

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def read_json(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        abort(404, description=f"File not found: {path}")
    except json.JSONDecodeError:
        abort(500, description=f"Invalid JSON format: {path}")

def filter_leaderboard(data):
    search_query = request.args.get('search', '').lower()
    weight_class = request.args.get('weight_class', '').lower()
    division_group = request.args.get('division_group', '').lower()
    limit = request.args.get('limit', type=int)

    if search_query:
        data = [f for f in data if search_query in f["Fighter"].lower()]

    if weight_class and weight_class != 'all':
        data = [f for f in data if f.get("Weight Class", "").lower() == weight_class]
    elif division_group == 'women':
        data = [f for f in data if f.get("Weight Class", "").lower().startswith("women's")]
    elif division_group == 'men':
        data = [f for f in data if not f.get("Weight Class", "").lower().startswith("women's")]

    if limit and limit > 0:
        data = data[:limit]

    return data

@app.route("/api/current", methods=["GET"])
def get_current():
    data_path = os.path.join(DATA_DIR, "current_elo_2.0.json")
    data = read_json(data_path)
    return jsonify(filter_leaderboard(data))

@app.route("/api/peak", methods=["GET"])
def get_peak():
    data_path = os.path.join(DATA_DIR, "peak_elo_2.0.json")
    data = read_json(data_path)
    return jsonify(filter_leaderboard(data))

@app.route("/api/fighter/<string:name>", methods=["GET"])
def get_fighter(name):
    data_path = os.path.join(DATA_DIR, "current_elo_2.0.json")
    data = read_json(data_path)
    results = [f for f in data if f["Fighter"].lower() == name.lower()]
    if not results:
        abort(404, description=f"Fighter not found: {name}")
    return jsonify(results[0])

@app.route("/api/meta", methods=["GET"])
def get_meta():
    import pandas as pd
    path = os.path.join(DATA_DIR, "fights_enhanced.csv")
    if not os.path.exists(path):
        abort(404, description="Fight data not available")

    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    fighters = set(df["Fighter 1"]) | set(df["Fighter 2"])

    title_fights = int(df["Is_Title_Fight"].sum())

    return jsonify({
        "data_updated_through": int(df["Date"].max().timestamp() * 1000),
        "total_fighters": len(fighters),
        "total_fights": len(df),
        "title_fights": title_fights,
    })

@app.route("/api/trending", methods=["GET"])
def get_trending():
    import pandas as pd
    path = os.path.join(DATA_DIR, "fights_with_elo_2.0.csv")
    if not os.path.exists(path):
        abort(404, description="Fight data not available")

    n_fights = request.args.get("fights", default=3, type=int)
    limit = request.args.get("limit", default=10, type=int)
    retirement_days = 730

    df = pd.read_csv(path)
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.sort_values("Date")
    today = df["Date"].max()

    f1 = df[["Date", "Fighter 1", "Fighter1_Elo_Start", "Fighter1_Elo_End"]].rename(
        columns={"Fighter 1": "Fighter", "Fighter1_Elo_Start": "Before", "Fighter1_Elo_End": "After"})
    f2 = df[["Date", "Fighter 2", "Fighter2_Elo_Start", "Fighter2_Elo_End"]].rename(
        columns={"Fighter 2": "Fighter", "Fighter2_Elo_Start": "Before", "Fighter2_Elo_End": "After"})
    long = pd.concat([f1, f2], ignore_index=True).sort_values("Date")

    current_data = {f["Fighter"]: f for f in read_json(os.path.join(DATA_DIR, "current_elo_2.0.json"))}

    movers = []
    for fighter, grp in long.groupby("Fighter"):
        grp = grp.sort_values("Date")
        if len(grp) < n_fights:
            continue
        last_fight_date = grp.iloc[-1]["Date"]
        if (today - last_fight_date).days >= retirement_days:
            continue
        last_n = grp.tail(n_fights)
        before, after = last_n.iloc[0]["Before"], last_n.iloc[-1]["After"]
        info = current_data.get(fighter, {})
        movers.append({
            "Fighter": fighter,
            "EloBefore": before,
            "EloAfter": after,
            "EloChange": after - before,
            "FightsCounted": n_fights,
            "Weight Class": info.get("Weight Class"),
            "Record": info.get("Record"),
        })

    movers.sort(key=lambda m: m["EloChange"], reverse=True)
    risers = movers[:limit]
    fallers = sorted(movers, key=lambda m: m["EloChange"])[:limit]

    return jsonify({"risers": risers, "fallers": fallers})

@app.route("/api/trends/<string:name>", methods=["GET"])
def get_trends(name):
    path = os.path.join(DATA_DIR, "fights_with_elo_2.0.csv")
    if not os.path.exists(path):
        abort(404, description="Fight data not available")
    import pandas as pd
    df = pd.read_csv(path)
    df = df[(df["Fighter 1"].str.lower() == name.lower()) | (df["Fighter 2"].str.lower() == name.lower())]

    result_data = []
    for _, row in df.iterrows():
        is_fighter1 = row["Fighter 1"].lower() == name.lower()
        result_data.append({
            "Date": row["Date"],
            "Opponent": row["Fighter 2"] if is_fighter1 else row["Fighter 1"],
            "Result": "Win" if row["Winner"] == (row["Fighter 1"] if is_fighter1 else row["Fighter 2"]) else ("Draw" if row["Winner"] == "Draw" else "Loss"),
            "Method": row["method"],
            "Event": row["Event"],
            "EloBefore": row["Fighter1_Elo_Start"] if is_fighter1 else row["Fighter2_Elo_Start"],
            "EloAfter": row["Fighter1_Elo_End"] if is_fighter1 else row["Fighter2_Elo_End"],
            "EloChange": (row["Fighter1_Elo_End"] - row["Fighter1_Elo_Start"]) if is_fighter1 else (row["Fighter2_Elo_End"] - row["Fighter2_Elo_Start"])
        })

    import json
    return json.dumps(result_data)

@app.route("/")
def home():
    return "Elo Tracker API is running."

if __name__ == "__main__":
    app.run(debug=True)

