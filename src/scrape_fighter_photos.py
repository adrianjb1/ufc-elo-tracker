import io, json, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from bs4 import BeautifulSoup
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
PHOTO_DIR = os.path.join(ROOT, "frontend", "public", "fighters")
PROFILES_PATH = os.path.join(DATA_DIR, "fighter_profiles.json")
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}
SIZE = 192
PEAK_TOP = 250
WORKERS = 4

def slugify(name):
    name = name.lower().replace("'", "").replace(".", "")
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    return re.sub(r"[\s-]+", "-", name).strip("-")

def headshot(png):
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    alpha = img.split()[-1].point(lambda a: 255 if a > 128 else 0)
    w, h = img.size
    bbox = alpha.getbbox()
    if not bbox:
        return None
    top = bbox[1]

    # head center = mean x of opaque pixels in the band just below the top of the head
    band = alpha.crop((0, top, w, min(h, top + int(h * 0.12))))
    xs = [x for x, v in enumerate(band.resize((w, 1), Image.Resampling.BOX).getdata()) if v > 0]
    cx = sum(xs) / len(xs) if xs else w / 2

    side = int(h * 0.40)
    left = int(min(max(0, cx - side / 2), max(0, w - side)))
    upper = max(0, top - int(h * 0.035))
    crop = img.crop((left, upper, left + side, upper + side))
    return crop.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

def fetch_profile(name):
    res = requests.get(f"https://www.ufc.com/athlete/{slugify(name)}", headers=HEADERS, timeout=15)
    if res.status_code != 200:
        return None
    soup = BeautifulSoup(res.text, "html.parser")
    profile = {}

    nick = soup.select_one(".hero-profile__nickname")
    if nick:
        profile["nickname"] = nick.get_text(strip=True).strip('"“”')

    img = soup.select_one("img.hero-profile__image")
    src = img.get("src") if img else None
    if src and "athlete_bio_full_body" in src and "silhouette" not in src.lower():
        png = requests.get(src if src.startswith("http") else "https://www.ufc.com" + src, headers=HEADERS, timeout=15)
        if png.ok:
            shot = headshot(png.content)
            if shot:
                filename = f"{slugify(name)}.webp"
                shot.save(os.path.join(PHOTO_DIR, filename), "WEBP", quality=82, method=6)
                profile["photo"] = filename
    return profile

def target_fighters():
    with open(os.path.join(DATA_DIR, "current_elo_2.0.json")) as f:
        current = [x["Fighter"] for x in json.load(f)]
    with open(os.path.join(DATA_DIR, "peak_elo_2.0.json")) as f:
        peak = [x["Fighter"] for x in json.load(f)][:PEAK_TOP]
    return list(dict.fromkeys(current + peak))

def main():
    refresh = "--refresh" in sys.argv
    os.makedirs(PHOTO_DIR, exist_ok=True)
    profiles = {}
    if os.path.exists(PROFILES_PATH):
        with open(PROFILES_PATH) as f:
            profiles = json.load(f)

    todo = [n for n in target_fighters() if refresh or n not in profiles]
    print(f"Fetching {len(todo)} fighter profiles from ufc.com", flush=True)

    def task(name):
        time.sleep(0.25)
        return name, fetch_profile(name)

    with ThreadPoolExecutor(WORKERS) as pool:
        futures = [pool.submit(task, n) for n in todo]
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                name, profile = fut.result()
            except Exception as e:
                print(f"  error: {e}", flush=True)
                continue
            profiles[name] = profile or {}
            status = "photo" if profile and "photo" in profile else "no photo" if profile is not None else "not found"
            print(f"  [{i}/{len(todo)}] {name}: {status}", flush=True)
            if i % 25 == 0:
                with open(PROFILES_PATH, "w") as f:
                    json.dump(profiles, f, indent=2, sort_keys=True)

    with open(PROFILES_PATH, "w") as f:
        json.dump(profiles, f, indent=2, sort_keys=True)
    with_photo = sum(1 for p in profiles.values() if "photo" in p)
    print(f"Saved {len(profiles)} profiles ({with_photo} with photos) to {PROFILES_PATH}")

if __name__ == "__main__":
    main()
