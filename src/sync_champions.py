import os, re, sys, time, unicodedata
from datetime import date
import pandas as pd
import requests
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
VACANCY_PATH = os.path.join(DATA_DIR, "vacancy_events.csv")
CURRENT_PATH = os.path.join(DATA_DIR, "current_elo_2.0.csv")
RANKINGS_URL = "https://www.ufc.com/rankings"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}
DIVISIONS = {
    "Flyweight", "Bantamweight", "Featherweight", "Lightweight", "Welterweight", "Middleweight",
    "Light Heavyweight", "Heavyweight", "Women's Strawweight", "Women's Flyweight",
    "Women's Bantamweight", "Women's Featherweight",
}

def normalize(name):
    name = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", name.lower())

def official_champions():
    for attempt in range(3):
        res = requests.get(RANKINGS_URL, headers=HEADERS, timeout=20)
        if res.status_code != 429:
            break
        time.sleep(10 * (attempt + 1))
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")
    champs = {}
    for group in soup.select(".view-grouping"):
        header = group.select_one(".view-grouping-header")
        division = header.get_text(" ", strip=True) if header else ""
        if division not in DIVISIONS or division in champs:
            continue
        champ = group.select_one(".rankings--athlete--champion h5 a, .rankings--athlete--champion h5")
        champs[division] = champ.get_text(" ", strip=True) if champ else None
    return champs

def tracker_titles():
    cur = pd.read_csv(CURRENT_PATH)
    champs = dict(zip(cur.loc[cur["Is_Champion"], "Weight Class"], cur.loc[cur["Is_Champion"], "Fighter"]))
    interims = dict(zip(cur.loc[cur["Is_Interim_Champion"], "Weight Class"], cur.loc[cur["Is_Interim_Champion"], "Fighter"]))
    last_fight = dict(zip(cur["Fighter"], pd.to_datetime(cur["Last_Fight"])))
    return champs, interims, last_fight

def sync(apply=True):
    try:
        official = official_champions()
    except requests.RequestException as e:
        print(f"Could not reach ufc.com ({e}), skipping champion check")
        return 0
    if not official:
        print("Could not read champions from ufc.com, skipping")
        return 0
    ours, interims, last_fight = tracker_titles()
    vacancies = pd.read_csv(VACANCY_PATH)
    vacancies["Date"] = pd.to_datetime(vacancies["Date"])
    today = pd.Timestamp(date.today())
    new_rows = []

    for division, champ in sorted(official.items()):
        holder = ours.get(division)
        if normalize(champ) == normalize(holder):
            continue

        interim = interims.get(division)
        promotes_interim = champ and normalize(champ) == normalize(interim)
        if holder and (promotes_interim or champ is None):
            already = vacancies[(vacancies["Fighter"] == holder) & (vacancies["Weight Class"] == division)
                               & (vacancies["Date"] >= last_fight.get(holder, pd.Timestamp.min))]
            if already.empty:
                new_rows.append({"Fighter": holder, "Weight Class": division, "Date": today, "Reason": "vacated"})
                print(f"  {division}: ufc.com lists {champ or 'vacant'}, recording {holder} as vacated")
            continue

        print(f"  {division}: ufc.com lists {champ or 'vacant'}, tracker has {holder or 'none'} (check for an unscraped title fight)")

    if new_rows and apply:
        out = pd.concat([vacancies, pd.DataFrame(new_rows)], ignore_index=True)
        out["Date"] = out["Date"].dt.strftime("%Y-%m-%d")
        out.to_csv(VACANCY_PATH, index=False)
        print(f"Added {len(new_rows)} row(s) to {VACANCY_PATH}")
    elif not new_rows:
        print("Champions match ufc.com")
    return len(new_rows)

if __name__ == "__main__":
    sync(apply="--dry-run" not in sys.argv)
