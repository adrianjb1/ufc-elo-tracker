import requests
from bs4 import BeautifulSoup
import pandas as pd
import os

URL = "http://ufcstats.com/statistics/events/completed?page=all"
HEADERS = {"User-Agent": "Mozilla/5.0"}

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUT_PATH = os.path.join(DATA_DIR, "ufc_events.csv")

def get_soup(url):
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()
    return BeautifulSoup(res.text, "html.parser")

def scrape_ufc_events():
    soup = get_soup(URL)

    event_links = soup.find_all("a", class_="b-link b-link_style_black")
    event_dates = soup.find_all("span", class_="b-statistics__date")
    event_locations = soup.find_all(
        "td", class_="b-statistics__table-col b-statistics__table-col_style_big-top-padding"
    )

    if event_links and ("upcoming" in event_links[0]["href"].lower() or not event_links[0]["href"]):
        event_links = event_links[1:]
        event_dates = event_dates[1:]
        event_locations = event_locations[1:]

    events = []
    for link, date_tag, loc_tag in zip(event_links, event_dates, event_locations):
        name = link.text.strip()
        href = link["href"].strip()
        date = date_tag.text.strip()
        location = loc_tag.text.strip()
        events.append([name, href, date, location])

    df = pd.DataFrame(events, columns=["Event", "URL", "Date", "Location"])
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {len(df)} events to {OUT_PATH}")
    return df

if __name__ == "__main__":
    df = scrape_ufc_events()
    print(df.head(10))
