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

    rows = soup.select('tr.b-statistics__table-row')

    events = []
    for row in rows:
        link = row.find('a', class_='b-link b-link_style_black')
        date_span = row.find('span', class_='b-statistics__date')
        loc_td = row.find('td', class_='b-statistics__table-col b-statistics__table-col_style_big-top-padding')

        if not link or not date_span or not loc_td:
            continue

        name = link.text.strip()
        href = link.get('href', '').strip()
        date = date_span.text.strip()
        location = loc_td.text.strip()

        if not href or 'upcoming' in href.lower():
            continue

        events.append([name, href, date, location])

    df = pd.DataFrame(events, columns=["Event", "URL", "Date", "Location"])
    df.to_csv(OUT_PATH, index=False)
    print(f"Saved {len(df)} events to {OUT_PATH}")
    return df

if __name__ == "__main__":
    df = scrape_ufc_events()
    print(df.head(10))
