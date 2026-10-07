# UFC Elo Tracker

Chess-style Elo ratings for every UFC fighter, built from every UFC fight since 1993, with current and all-time leaderboards.

As a fan of Mixed Martial Arts and the UFC in particular, I've been a witness to the challenges that arise in the Pound-For-Pound rankings. Many fans often complain about certain aspects of the Pound-For-Pound rankings and also want different ways to interpret the levels of various fighters. I want to utilize the data from the UFC's history and create an Elo system that assigns fighters with their own ranking. I want to prioritize the current state of the fighting world, therefore putting an emphasis on activity/recency of fights. It has Elo ratings for both current and peak Elo.

This repository includes the following: the web scrapers to collect data, an Elo tracker that interprets this data, corresponding CSV/JSON files for Elo, and the code for the frontend aspect of this project.

My goal in this project is to properly incorporate an algorithm that contextualizes the level of fighters to my best ability. My main focus is on making the top 10 fairly accurate, the rest of the roster might have certain issues and it's important to know that things like finishes and win streaks will boost non-champion fighters. There's a lot of factors that I'm trying to consider but at the end of the day this is primarily for fun.

### Additional notes

Despite how much I've played around with it already, this tracker isn't perfect and it can't capture certain contexts perfectly, but I think it's alright. It prioritizes certain things like Championship bouts/status for the current Elo leaderboard. There are a lot of factors that go into deciding the Elo for fighters, but I try to prioritize Champions a lot along with certain contenders. I'll also continue to work on it as necessary and want to make improvements. Overall though, this is mainly just a fun project so I'm fine with it not being perfect.

## How it works

Every fighter starts at 1000 Elo and gains or loses points with each UFC fight, with more on the line for finishes, title fights, main events, and wins over strong opponents. No-contests don't count. The current leaderboard also rewards champions, decays ratings for inactive fighters (time holding a belt counts as active), and leaves off retired fighters. The all-time leaderboard uses each fighter's peak rating.

The site has current and all-time rankings by division, trending fighters, per-fighter Elo charts, and a head-to-head matchup predictor.

## Running locally

Requires Python 3.12+ and Node 20+.

```bash
python3 -m venv venv && source venv/bin/activate
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

The champion check catches belts that change hands outside the cage. If ufc.com lists the interim champ as champion, or a division as vacant, the old champion is recorded as vacated in `data/vacancy_events.csv` automatically. Other mismatches are only printed for review. Retirements can be added to the same file by hand with `retirement` as the reason.

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
