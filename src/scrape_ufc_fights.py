import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
from time import sleep

HEADERS = {"User-Agent": "Mozilla/5.0"}
EVENTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ufc_events.csv")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUT_PATH = os.path.join(DATA_DIR, "fights_full.csv")

def get_soup(url):
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()
    return BeautifulSoup(res.text, "html.parser")

def parse_event_fights(event_name, event_date, event_url):
    soup = get_soup(event_url)
    rows = soup.find_all("tr", class_="b-fight-details__table-row b-fight-details__table-row__hover js-fight-details-click")
    fights = []
    for row in rows:
        cols = row.find_all("td")
        if not cols or len(cols) < 10:
            continue
        weight_class = cols[6].get_text(strip=True)
        fighter_tags = row.find_all("a", class_="b-link b-link_style_black")
        if len(fighter_tags) < 2:
            continue
        fighter1, fighter2 = [t.get_text(strip=True) for t in fighter_tags[:2]]

        flags = row.select("i.b-flag__text")
        results = [f.get_text(strip=True).lower() for f in flags]
        if len(results) >= 1 and "win" in results[0]:
            winner = fighter1
        elif len(results) >= 2 and "win" in results[1]:
            winner = fighter2
        else:
            winner = "Draw"

        method = cols[7].get_text(strip=True)
        round_ = cols[8].get_text(strip=True)
        time_ = cols[9].get_text(strip=True)

        fight_url = row.get("data-link", "").strip()

        fights.append([
            event_name, event_date, weight_class, fighter1, fighter2,
            winner, method, round_, time_, event_url, fight_url
        ])
    return fights

def scrape_all_fights():
    events = pd.read_csv(EVENTS_PATH)
    existing = pd.read_csv(OUT_PATH) if os.path.exists(OUT_PATH) else pd.DataFrame()

    buffer = []
    for idx, row in events.iterrows():
        event_name = row["Event"]
        event_date = row["Date"]
        event_url = row["URL"]

        print(f"Scraping fights from {event_name}... ({idx + 1}/{len(events)})")

        try:
            fights = parse_event_fights(event_name, event_date, event_url)

            if not existing.empty and "Event URL" in existing.columns:
                existing = existing[existing["Event URL"] != event_url]

            buffer.extend(fights)
        except Exception as e:
            print(f"Failed to scrape {event_name}: {e}")

        if (idx + 1) % 25 == 0 or idx == len(events) - 1:
            new_df = pd.DataFrame(buffer, columns=[
                "Event", "Date", "Weight Class", "Fighter 1", "Fighter 2",
                "Winner", "Method", "Round", "Time", "Event URL", "Fight URL"
            ])
            if not existing.empty:
                df = pd.concat([existing, new_df], ignore_index=True)
            else:
                df = new_df
            df = df.drop_duplicates(subset=["Fight URL", "Event", "Fighter 1", "Fighter 2"], keep="last")
            df.to_csv(OUT_PATH, index=False)
            print(f"Saved progress at {idx + 1}/{len(events)} events, total fights: {len(df)}")
            existing = df
            buffer = []
        sleep(3)

    print("Scraping complete")


if __name__ == "__main__":
    scrape_all_fights()
