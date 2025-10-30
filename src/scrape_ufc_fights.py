import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
from time import sleep

HEADERS = {"User-Agent": "Mozilla/5.0"}
EVENTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ufc_events.csv")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUT_PATH = os.path.join(DATA_DIR, "fights.csv")

def get_soup(url):
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()
    return BeautifulSoup(res.text, "html.parser")

def parse_event_fights(event_name, event_date, url):
    soup = get_soup(url)
    fight_table = soup.find_all("tr", class_="b-fight-details__table-row b-fight-details__table-row__hover js-fight-details-click")

    fights = []
    for row in fight_table:
        cols = row.find_all("td")
        if not cols or len(cols) < 7:
            continue

        weight_class = cols[6].text.strip()
        fighter_tags = row.find_all("a", class_="b-link b-link_style_black")
        if len(fighter_tags) < 2:
            continue
        fighter1, fighter2 = [t.text.strip() for t in fighter_tags[:2]]

        winner_tag = row.find("i", class_="b-flag b-flag_style_green")
        if winner_tag:
            winner = fighter1
        else:
            winner_tag_red = row.find("i", class_="b-flag b-flag_style_red")
            winner = fighter2 if winner_tag_red else "Draw"

        method = cols[7].text.strip() if len(cols) > 7 else ""
        round_ = cols[8].text.strip() if len(cols) > 8 else ""
        time_ = cols[9].text.strip() if len(cols) > 9 else ""

        fights.append([
            event_name, event_date, weight_class, fighter1, fighter2,
            winner, method, round_, time_, url
        ])

    return fights

def scrape_all_fights():
    events = pd.read_csv(EVENTS_PATH)
    all_fights = []

    for _, row in events.iterrows():
        event_name = row["Event"]
        event_date = row["Date"]
        event_url = row["URL"]
        print(f"Scraping fights from {event_name}...")
        try:
            fights = parse_event_fights(event_name, event_date, event_url)
            all_fights.extend(fights)
        except Exception as e:
            print(f"Failed to scrape {event_name}: {e}")
        sleep(1)

    df = pd.DataFrame(all_fights, columns=[
        "Event", "Date", "Weight Class", "Fighter 1", "Fighter 2",
        "Winner", "Method", "Round", "Time", "Fight URL"
    ])
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {len(df)} fights to {OUT_PATH}")
    return df

if __name__ == "__main__":
    scrape_all_fights()
