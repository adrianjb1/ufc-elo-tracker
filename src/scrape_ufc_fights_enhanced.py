import re
import pandas as pd
import os
from time import sleep
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
EVENTS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ufc_events.csv")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUT_PATH = os.path.join(DATA_DIR, "fights_enhanced.csv")
FIGHT_COLUMNS = [
    "Event", "Date", "Weight Class", "Fighter 1", "Fighter 2",
    "Winner", "Method", "Round", "Time", "Event URL", "Fight URL", "method",
    "Is_Title_Fight", "Is_Main_Event", "Is_Interim"
]

# ufcstats.com serves a JS challenge before the real page, so plain requests only see the challenge shell
_browser_ctx = {"playwright": None, "browser": None, "page": None}

def _get_page():
    if _browser_ctx["page"] is None:
        _browser_ctx["playwright"] = sync_playwright().start()
        _browser_ctx["browser"] = _browser_ctx["playwright"].chromium.launch(headless=True)
        _browser_ctx["page"] = _browser_ctx["browser"].new_page(user_agent=USER_AGENT)
    return _browser_ctx["page"]

def close_browser():
    if _browser_ctx["browser"] is not None:
        _browser_ctx["browser"].close()
        _browser_ctx["playwright"].stop()
        _browser_ctx["page"] = None
        _browser_ctx["browser"] = None
        _browser_ctx["playwright"] = None

def get_soup(url, wait_selector):
    page = _get_page()
    page.goto(url, wait_until="networkidle", timeout=30000)
    page.wait_for_selector(wait_selector, timeout=30000)
    return BeautifulSoup(page.content(), "html.parser")

# belt.png also marks Road to UFC / TUF finals, so the fight page title ("UFC ... Title Bout") decides it
def check_title_fight(fight_url):
    if not fight_url:
        return False, False
    try:
        soup = get_soup(fight_url, "i.b-fight-details__fight-title")
        title_el = soup.find("i", class_="b-fight-details__fight-title")
        if not title_el:
            return False, False
        text = re.sub(r"\s+", " ", title_el.get_text(" ", strip=True)).strip()
        is_title = text.startswith("UFC")
        return is_title, is_title and "interim" in text.lower()
    except Exception as e:
        print(f"    Failed to verify title fight at {fight_url}: {e}")
        return False, False

def parse_event_fights(event_name, event_date, event_url):
    soup = get_soup(event_url, "tr.b-fight-details__table-row__hover")
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

        is_interim = False
        if is_title_fight:
            is_title_fight, is_interim = check_title_fight(fight_url)

        fights.append([
            event_name, event_date, weight_class, fighter1, fighter2,
            winner, method, round_, time_, event_url, fight_url, simplified_method,
            is_title_fight, is_main_event, is_interim
        ])
    return fights

def scrape_all_fights():
    events = pd.read_csv(EVENTS_PATH)
    all_fights = []
    try:
        for idx, row in events.iterrows():
            event_name = row["Event"]
            event_date = row["Date"]
            event_url = row["URL"]

            print(f"Scraping fights from {event_name}... ({idx + 1}/{len(events)})")

            try:
                fights = parse_event_fights(event_name, event_date, event_url)
                all_fights.extend(fights)
            except Exception as e:
                print(f"Failed to scrape {event_name}: {e}")

            if (idx + 1) % 25 == 0 or idx == len(events) - 1:
                df = pd.DataFrame(all_fights, columns=FIGHT_COLUMNS)
                df = df.drop_duplicates(subset=["Fight URL", "Event", "Fighter 1", "Fighter 2"], keep="last")
                df.to_csv(OUT_PATH, index=False)
                print(f"Saved progress at {idx + 1}/{len(events)} events, total fights: {len(df)}")
            sleep(0.5)
    finally:
        close_browser()
    print("Scraping complete")

if __name__ == "__main__":
    scrape_all_fights()
