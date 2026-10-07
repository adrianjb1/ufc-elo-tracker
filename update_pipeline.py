import pandas as pd, os, sys, subprocess
from time import sleep

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "src"))

from scrape_ufc_fights_enhanced import get_soup, close_browser, parse_event_fights, FIGHT_COLUMNS

DATA_DIR = os.path.join(ROOT, "data")
EVENTS_PATH = os.path.join(DATA_DIR, "ufc_events.csv")
FIGHTS_PATH = os.path.join(DATA_DIR, "fights_enhanced.csv")
TRACKER_PATH = os.path.join(ROOT, "src", "tracker2.0.py")
EVALUATE_PATH = os.path.join(ROOT, "src", "evaluate.py")

def scrape_new_events():
    print("\n=== Step 1: Checking for new UFC events ===")

    existing_events = pd.read_csv(EVENTS_PATH)
    existing_urls = set(existing_events["URL"].tolist())

    soup = get_soup("http://ufcstats.com/statistics/events/completed?page=all", "tr.b-statistics__table-row")
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
            new_events.append([link.text.strip(), href, date_span.text.strip(), loc_td.text.strip()])

    if not new_events:
        print("No new events found.")
        return []

    print(f"Found {len(new_events)} new events:")
    for event in new_events:
        print(f"  - {event[0]} ({event[2]})")

    return new_events

def scrape_new_fights(new_events):
    if not new_events:
        return []

    print("\n=== Step 2: Scraping fights from new events ===")

    all_new_fights = []
    scraped_events = []
    for event in new_events:
        event_name, event_url, event_date = event[0], event[1], event[2]
        print(f"Scraping {event_name}...")

        try:
            fights = parse_event_fights(event_name, event_date, event_url)
        except Exception as e:
            print(f"  Failed to scrape: {e}")
            continue

        if not fights:
            print("  No fights found, will retry next run")
            continue

        all_new_fights.extend(fights)
        scraped_events.append(event)
        print(f"  Found {len(fights)} fights")
        sleep(0.5)

    if all_new_fights:
        existing_fights = pd.read_csv(FIGHTS_PATH)
        new_fights_df = pd.DataFrame(all_new_fights, columns=FIGHT_COLUMNS)
        updated_fights = pd.concat([new_fights_df, existing_fights], ignore_index=True)
        updated_fights = updated_fights.drop_duplicates(subset=["Fight URL", "Event", "Fighter 1", "Fighter 2"], keep="first")
        updated_fights.to_csv(FIGHTS_PATH, index=False)
        print(f"Added {len(all_new_fights)} new fights to {FIGHTS_PATH}")

    return scraped_events

def save_events(scraped_events):
    if not scraped_events:
        return
    existing_events = pd.read_csv(EVENTS_PATH)
    new_df = pd.DataFrame(scraped_events, columns=["Event", "URL", "Date", "Location"])
    pd.concat([new_df, existing_events], ignore_index=True).to_csv(EVENTS_PATH, index=False)
    print(f"Updated {EVENTS_PATH}")

def run_tracker():
    print("\n=== Step 3: Running tracker2.0.py ===", flush=True)
    subprocess.run([sys.executable, TRACKER_PATH], check=True)
    print("Tracker completed successfully")
    print("\n=== Step 4: Backtesting predictions ===", flush=True)
    subprocess.run([sys.executable, EVALUATE_PATH], check=True)

def main():
    print("\n" + "="*50)
    print("UFC ELO TRACKER - INCREMENTAL UPDATE PIPELINE")
    print("="*50)

    try:
        new_events = scrape_new_events()
        scraped_events = scrape_new_fights(new_events)
    finally:
        close_browser()

    save_events(scraped_events)
    run_tracker()

    print("\n" + "="*50)
    print("UPDATE COMPLETE")
    print("="*50)
    print("\nReview the changes in data/, then commit when ready.\n")

if __name__ == "__main__":
    main()
