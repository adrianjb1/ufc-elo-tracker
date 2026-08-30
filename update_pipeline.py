import requests, pandas as pd, os, subprocess
from bs4 import BeautifulSoup
from time import sleep

DATA_DIR = "data"
HEADERS = {"User-Agent": "Mozilla/5.0"}
EVENTS_PATH = os.path.join(DATA_DIR, "ufc_events.csv")
FIGHTS_PATH = os.path.join(DATA_DIR, "fights_enhanced.csv")

def get_soup(url):
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()
    return BeautifulSoup(res.text, "html.parser")

def scrape_new_events():
    print("\n=== Step 1: Checking for new UFC events ===")

    existing_events = pd.read_csv(EVENTS_PATH)
    existing_urls = set(existing_events["URL"].tolist())

    soup = get_soup("http://ufcstats.com/statistics/events/completed?page=all")
    rows = soup.select('tr.b-statistics__table-row')

    new_events = []
    for row in rows:
        link = row.find('a', class_='b-link b-link_style_black')
        date_span = row.find('span', class_='b-statistics__date')
        loc_td = row.find('td', class_='b-statistics__table-col b-statistics__table-col_style_big-top-padding')

        if not link or not date_span or not loc_td:
            continue

        href = link.get('href', '').strip()
        if not href or 'upcoming' in href.lower():
            continue

        if href not in existing_urls:
            name = link.text.strip()
            date = date_span.text.strip()
            location = loc_td.text.strip()
            new_events.append([name, href, date, location])

    if not new_events:
        print("No new events found.")
        return []

    print(f"Found {len(new_events)} new events:")
    for event in new_events:
        print(f"  - {event[0]} ({event[2]})")

    new_df = pd.DataFrame(new_events, columns=["Event", "URL", "Date", "Location"])
    updated_events = pd.concat([new_df, existing_events], ignore_index=True)
    updated_events.to_csv(EVENTS_PATH, index=False)
    print(f"Updated {EVENTS_PATH}")

    return new_events

def parse_event_fights(event_name, event_date, event_url):
    soup = get_soup(event_url)
    rows = soup.find_all("tr", class_="b-fight-details__table-row b-fight-details__table-row__hover js-fight-details-click")
    fights = []

    for idx, row in enumerate(rows):
        cols = row.find_all("td")
        if not cols or len(cols) < 10:
            continue

        weight_class_col = cols[6]
        weight_class_text = weight_class_col.get_text(strip=True)
        belt_img = weight_class_col.find("img", src=lambda x: x and "belt.png" in x)
        is_title_fight = belt_img is not None
        weight_class = weight_class_text.replace("Title Bout", "").replace("Championship", "").strip()
        is_main_event = (idx == 0)

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

        if winner == fighter2:
            fighter1, fighter2 = fighter2, fighter1

        method = cols[7].get_text(strip=True)
        if "KO" in method:
            simplified_method = "KO"
        elif "SUB" in method:
            simplified_method = "SUB"
        else:
            simplified_method = "DEC"

        round_ = cols[8].get_text(strip=True)
        time_ = cols[9].get_text(strip=True)
        fight_url = row.get("data-link", "").strip()

        fights.append([
            event_name, event_date, weight_class, fighter1, fighter2,
            winner, method, round_, time_, event_url, fight_url, simplified_method,
            is_title_fight, is_main_event
        ])
    return fights

def scrape_new_fights(new_events):
    if not new_events:
        return

    print("\n=== Step 2: Scraping fights from new events ===")

    existing_fights = pd.read_csv(FIGHTS_PATH)
    all_new_fights = []

    for event in new_events:
        event_name, event_url, event_date, _ = event[0], event[1], event[2], event[3]
        print(f"Scraping {event_name}...")

        try:
            fights = parse_event_fights(event_name, event_date, event_url)
            all_new_fights.extend(fights)
            print(f"  Found {len(fights)} fights")
        except Exception as e:
            print(f"  Failed to scrape: {e}")

        sleep(0.5)

    if not all_new_fights:
        print("No new fights to add.")
        return

    new_fights_df = pd.DataFrame(all_new_fights, columns=[
        "Event", "Date", "Weight Class", "Fighter 1", "Fighter 2",
        "Winner", "Method", "Round", "Time", "Event URL", "Fight URL", "method",
        "Is_Title_Fight", "Is_Main_Event"
    ])

    updated_fights = pd.concat([new_fights_df, existing_fights], ignore_index=True)
    updated_fights = updated_fights.drop_duplicates(subset=["Fight URL", "Event", "Fighter 1", "Fighter 2"], keep="first")
    updated_fights.to_csv(FIGHTS_PATH, index=False)

    print(f"Added {len(all_new_fights)} new fights to {FIGHTS_PATH}")

def run_tracker():
    print("\n=== Step 3: Running tracker2.0.py ===")
    subprocess.run(["python3", "src/tracker2.0.py"], check=True)
    print("Tracker completed successfully")

def main():
    print("\n" + "="*50)
    print("UFC ELO TRACKER - INCREMENTAL UPDATE PIPELINE")
    print("="*50)

    new_events = scrape_new_events()
    scrape_new_fights(new_events)
    run_tracker()

    print("\n" + "="*50)
    print("UPDATE COMPLETE")
    print("="*50)
    print("\nReview the changes, then manually commit/push to GitHub when ready.")
    print("\nFiles updated:")
    print(f"  - {EVENTS_PATH}")
    print(f"  - {FIGHTS_PATH}")
    print(f"  - data/current_elo_2.0.csv")
    print(f"  - data/peak_elo_2.0.csv")
    print(f"  - data/current_elo_2.0.json")
    print(f"  - data/peak_elo_2.0.json")
    print(f"  - data/fights_with_elo_2.0.csv\n")

if __name__ == "__main__":
    main()
