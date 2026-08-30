As a fan of Mixed Martial Arts and the UFC in particular, I've been a witness to the challenges that arise in the Pound-For-Pound rankings. Many fans often complain about certain aspects of the Pound-For-Pound rankings and also want different ways to interpret the levels of various fighters. I want to utilize the data from the UFC's history and create an elo system that assigns fighters with their own ranking. I want to prioritize the current state of the fighting world, therefore putting an emphasis on activity/recency of fights. I'll have elo ratings for current and peak elo.

This repository will include the following: the webscrapers to collect data, an elo tracker that interprets this data, correlating CSV/JSON files for elo, and the code for the frontend aspect of this project.

My goal in this project is to properly incorporate an algorithm that contextualizes the level of fighters to my best ability. My main focus is on making the top 10 fairly accurate, the rest of the roster might have certain issues and it's important to know that things like finishes and win streaks will boost non-champion fighters. There's a lot of factors that I'm trying to consider but at the end of the day this is primarily for fun.

Additional Notes:
Despite how much I've played around with it already, this tracker isn't perfect and it can't capture certain contexts perfectly, but I think it's alright. It prioritizes certain things like Championship bouts/status for the current elo leaderboard. There's a lot of factors that go into deciding the elo for fighters, but I try to prioritize Champions a lot along with certain contenders. I'll also continue to work on it as necessary and want to make to make improvements. Overall though, this is mainly just a fun project so I'm fine with it not being perfect.

## How it works

**Data pipeline:** `update_pipeline.py` scrapes ufcstats.com incrementally — it only pulls events and fights that aren't already in `data/`, rather than rescraping full fight history every time. ufcstats.com puts a JavaScript proof-of-work challenge in front of its pages, so the scraper runs a real headless browser (Playwright) instead of a plain HTTP client, which would otherwise just get served the challenge page and silently return no data.

**Elo engine:** `src/tracker2.0.py` is the production tracker. It weighs finishes, activity level, opponent strength, and title-fight context into each rating change, then applies inactivity decay and a championship boost to the final numbers. Title fights and current champions are detected algorithmically (from a belt icon ufcstats.com renders next to true title bouts) rather than hardcoded — the only manual input is a small seed file for who currently holds each belt.

**API:** A Flask backend (`web/app.py`) serves current and peak Elo rankings, a single fighter's data, and a fighter's fight-by-fight Elo history, with search/weight-class/limit filtering built in.

**Frontend:** A React app (Tailwind, black/red theme) shows the leaderboard with search and filters, and a per-fighter modal with an Elo Progression chart built from their fight history.

See [CLAUDE.md](CLAUDE.md) for the full architecture, algorithm parameters, and commands to run each piece.
