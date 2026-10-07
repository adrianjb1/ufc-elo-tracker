import pandas as pd, numpy as np, os, json

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
FIGHTS_ELO_PATH = os.path.join(DATA_DIR, "fights_with_elo_2.0.csv")
OUT_PATH = os.path.join(DATA_DIR, "model_accuracy.json")
MIN_PRIOR_FIGHTS = 3

def win_prob(a, b):
    return 1 / (1 + 10 ** ((b - a) / 400))

def score(df):
    p = df["P_Winner"].clip(1e-6, 1 - 1e-6)
    decided = df[df["Elo_Gap"] != 0]
    return {
        "fights": int(len(df)),
        "accuracy": round(float((decided["P_Winner"] > 0.5).mean()), 4) if len(decided) else None,
        "brier": round(float(((1 - p) ** 2).mean()), 4),
        "log_loss": round(float(-np.log(p).mean()), 4),
    }

def load():
    f = pd.read_csv(FIGHTS_ELO_PATH)
    f["Date"] = pd.to_datetime(f["Date"], errors="coerce")
    f = f.sort_values("Date", kind="stable").reset_index(drop=True)

    seen = {}
    prior1, prior2 = [], []
    for a, b in zip(f["Fighter 1"], f["Fighter 2"]):
        prior1.append(seen.get(a, 0))
        prior2.append(seen.get(b, 0))
        seen[a] = seen.get(a, 0) + 1
        seen[b] = seen.get(b, 0) + 1
    f["Prior1"], f["Prior2"] = prior1, prior2

    # the scraper always puts the winner in Fighter 1, so decisive rows are scored from their side
    f = f[f["Winner"] == f["Fighter 1"]].copy()
    f["P_Winner"] = win_prob(f["Fighter1_Elo_Start"], f["Fighter2_Elo_Start"])
    f["Elo_Gap"] = (f["Fighter1_Elo_Start"] - f["Fighter2_Elo_Start"]).round(6)
    f["Experienced"] = (f["Prior1"] >= MIN_PRIOR_FIGHTS) & (f["Prior2"] >= MIN_PRIOR_FIGHTS)
    return f

def calibration(df, bins=(0.5, 0.6, 0.7, 0.8, 1.0)):
    fav = df[df["Elo_Gap"] != 0].copy()
    fav["P_Fav"] = np.maximum(fav["P_Winner"], 1 - fav["P_Winner"])
    fav["Fav_Won"] = fav["P_Winner"] > 0.5
    fav["Bucket"] = pd.cut(fav["P_Fav"], bins=list(bins), include_lowest=True)
    rows = []
    for (lo, hi), (_, g) in zip(zip(bins, bins[1:]), fav.groupby("Bucket", observed=False)):
        if not len(g):
            continue
        rows.append({
            "range": f"{round(lo * 100)}-{round(hi * 100)}%",
            "fights": int(len(g)),
            "predicted": round(float(g["P_Fav"].mean()), 4),
            "actual": round(float(g["Fav_Won"].mean()), 4),
        })
    return rows

def evaluate():
    f = load()
    exp = f[f["Experienced"]]
    recent = exp[exp["Date"] >= exp["Date"].max() - pd.DateOffset(years=5)]
    era = {}
    for start in range(1990, int(f["Date"].dt.year.max()) + 1, 10):
        g = exp[(exp["Date"].dt.year >= start) & (exp["Date"].dt.year < start + 10)]
        if len(g):
            era[f"{start}s"] = score(g)

    return {
        "min_prior_fights": MIN_PRIOR_FIGHTS,
        "all": score(f),
        "experienced": score(exp),
        "last_5_years": score(recent),
        "title_fights": score(exp[exp["Is_Title_Fight"] == True]),
        "by_decade": era,
        "calibration": calibration(exp),
    }

def main():
    results = evaluate()
    with open(OUT_PATH, "w") as fh:
        json.dump(results, fh, indent=2)

    print(f"Backtest (fights where both fighters had {MIN_PRIOR_FIGHTS}+ prior UFC fights unless noted)")
    print(f"{'':16}{'fights':>8}{'acc':>8}{'brier':>8}{'logloss':>9}")
    for key in ["all", "experienced", "last_5_years", "title_fights"]:
        s = results[key]
        print(f"{key:16}{s['fights']:>8}{s['accuracy']:>8.3f}{s['brier']:>8.3f}{s['log_loss']:>9.3f}")
    for decade, s in results["by_decade"].items():
        print(f"  {decade:14}{s['fights']:>8}{s['accuracy']:>8.3f}{s['brier']:>8.3f}{s['log_loss']:>9.3f}")
    print("\nCalibration (favorite's predicted vs actual win rate)")
    for c in results["calibration"]:
        print(f"  {c['range']:>8}  n={c['fights']:<5} predicted {c['predicted']:.3f}  actual {c['actual']:.3f}")
    print(f"\nSaved {OUT_PATH}")

if __name__ == "__main__":
    main()
