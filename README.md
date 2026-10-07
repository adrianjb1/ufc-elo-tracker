As a fan of Mixed Martial Arts and the UFC in particular, I've been a witness to the challenges that arise in the Pound-For-Pound rankings. Many fans often complain about certain aspects of the Pound-For-Pound rankings and also want different ways to interpret the levels of various fighters. I want to utilize the data from the UFC's history and create an elo system that assigns fighters with their own ranking. I want to prioritize the current state of the fighting world, therefore putting an emphasis on activity/recency of fights. I'll have elo ratings for current and peak elo.

This repository will include the following: the webscrapers to collect data, an elo tracker that interprets this data, correlating CSV/JSON files for elo, and the code for the frontend aspect of this project.

My goal in this project is to properly incorporate an algorithm that contextualizes the level of fighters to my best ability. My main focus is on making the top 10 fairly accurate, the rest of the roster might have certain issues and it's important to know that things like finishes and win streaks will boost non-champion fighters. There's a lot of factors that I'm trying to consider but at the end of the day this is primarily for fun.

Additional Notes:
Despite how much I've played around with it already, this tracker isn't perfect and it can't capture certain contexts perfectly, but I think it's alright. It prioritizes certain things like Championship bouts/status for the current elo leaderboard. There's a lot of factors that go into deciding the elo for fighters, but I try to prioritize Champions a lot along with certain contenders. I'll also continue to work on it as necessary and want to make improvements. Overall though, this is mainly just a fun project so I'm fine with it not being perfect.

## Running locally

```bash
pip install -r requirements.txt
python3 -m playwright install chromium   # only needed for scraping

python3 web/app.py                        # API on http://127.0.0.1:5000
cd frontend && npm install && npm start   # UI on http://localhost:3000
```

The React dev server proxies `/api` requests to Flask, so no extra config is needed.

## Updating data

```bash
python3 update_pipeline.py
```

Scrapes any new events from ufcstats.com, appends the fights to `data/fights_enhanced.csv`, reruns `src/tracker2.0.py` to regenerate the leaderboards, checks every division's champion against ufc.com's official rankings (`src/sync_champions.py`), then backtests the ratings with `src/evaluate.py`.

The champion check catches belts that change hands outside the cage. If ufc.com lists the interim champ as champion, or a division as vacant, the old champion is recorded as vacated in `data/vacancy_events.csv` automatically. Other mismatches are only printed for review. Announced retirements and vacated titles go in `data/vacancy_events.csv`.

Fighter headshots and nicknames come from ufc.com:

```bash
python3 src/scrape_fighter_photos.py            # only fighters not fetched yet
python3 src/scrape_fighter_photos.py --refresh  # refetch everyone
```

Photos are cropped to the head and shoulders and saved to `frontend/public/fighters/`; nicknames and photo filenames go in `data/fighter_profiles.json`.

## How accurate is it?

`python3 src/evaluate.py` replays every fight and checks whether the higher-rated fighter won, using each fighter's Elo going into the fight. Results are saved to `data/model_accuracy.json` and served at `/api/accuracy`. Between fighters with 3+ prior UFC fights the favorite wins about 56% of the time (about 61% in title fights), and the predicted win probabilities line up closely with actual results.

## Tests

```bash
pytest -q tests
cd frontend && CI=true npm test
```

## Deploying

Flask serves both the API and the built frontend, so the app runs as a single web service:

```bash
pip install -r requirements.txt
cd frontend && npm ci && npm run build && cd ..
gunicorn --chdir web app:app --bind 0.0.0.0:$PORT
```

The `Procfile` covers the start command on Heroku/Render/Railway-style hosts. Optional env vars:

- `REACT_APP_API_URL` (build time): API origin if the frontend is hosted separately
- `CORS_ORIGINS`: comma-separated allowed origins for `/api` (default `*`)
