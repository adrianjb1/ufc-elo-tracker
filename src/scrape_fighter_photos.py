import requests
from bs4 import BeautifulSoup
import os
import json
import time

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
FRONTEND_PUBLIC = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "public", "fighters")
HEADERS = {"User-Agent": "Mozilla/5.0"}

os.makedirs(FRONTEND_PUBLIC, exist_ok=True)

def get_fighter_slug(name):
    """Convert fighter name"""
    slug = name.lower().replace(" ", "-")
    
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    return slug

def scrape_fighter_photo(fighter_name):
    """Download fighter photo"""
    slug = get_fighter_slug(fighter_name)
    url = f"https://www.ufc.com/athlete/{slug}"

    try:
        print(f"Fetching photo for {fighter_name}...")
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        img_tag = None

        img_tag = soup.find('img', class_='hero-profile__image')
        if not img_tag:
            img_tag = soup.find('img', class_='c-hero__image')
        if not img_tag:
            for img in soup.find_all('img'):
                src = img.get('src', '')
                if 'athlete' in src or 'fighter' in src:
                    img_tag = img
                    break

        if img_tag and img_tag.get('src'):
            img_url = img_tag['src']
            if not img_url.startswith('http'):
                img_url = 'https://www.ufc.com' + img_url

            img_response = requests.get(img_url, headers=HEADERS, timeout=10)
            img_response.raise_for_status()

            filename = f"{slug}.jpg"
            filepath = os.path.join(FRONTEND_PUBLIC, filename)

            with open(filepath, 'wb') as f:
                f.write(img_response.content)

            print(f"✓ Downloaded photo for {fighter_name}")
            return filename
        else:
            print(f"✗ No photo found for {fighter_name}")
            return None

    except Exception as e:
        print(f"✗ Error fetching {fighter_name}: {str(e)}")
        return None

def main():
    elo_current_path = os.path.join(DATA_DIR, "elo_current.json")
    elo_peak_path = os.path.join(DATA_DIR, "elo_peak.json")

    if not os.path.exists(elo_current_path):
        print("Error: elo_current.json not found")
        return

    if not os.path.exists(elo_peak_path):
        print("Error: elo_peak.json not found")
        return

    with open(elo_current_path, 'r') as f:
        current_fighters = json.load(f)

    with open(elo_peak_path, 'r') as f:
        peak_fighters = json.load(f)

    top_current = current_fighters[:25]
    top_peak = peak_fighters[:25]

    fighters_dict = {}
    for fighter in top_current + top_peak:
        fighters_dict[fighter['Fighter']] = fighter

    top_fighters = list(fighters_dict.values())

    print(f"\nScraping photos for {len(top_fighters)} unique fighters (from top 25 current + top 25 peak)...\n")

    results = {}
    for fighter in top_fighters:
        fighter_name = fighter['Fighter']
        filename = scrape_fighter_photo(fighter_name)
        if filename:
            results[fighter_name] = filename

        time.sleep(1)

    mapping_path = os.path.join(FRONTEND_PUBLIC, "fighter_photos.json")
    with open(mapping_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n✓ Complete! Downloaded {len(results)} photos")
    print(f"✓ Saved to: {FRONTEND_PUBLIC}")
    print(f"✓ Mapping saved to: {mapping_path}")

if __name__ == "__main__":
    main()
