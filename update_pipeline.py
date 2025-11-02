import subprocess, os
from datetime import datetime

print("\nStarting weekly update\n")

# run scrapers
scripts = [
    "src/scrape_ufc_events.py",
    "src/scrape_ufc_fights.py",
    "src/initial_tracker.py"
]

for s in scripts:
    if os.path.exists(s):
        print(f"Running {s} ...")
        subprocess.run(["python3", s], check=True)
    else:
        print(f"Skipped {s} (file not found)")

# auto commit/push
stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
print("\nCommitting updated files")

os.system("git add data/initial_current_elo.csv data/initial_peak_elo.csv data/elo_current.json data/elo_peak.json data/fights_with_elo.csv")
os.system(f'git commit -m "update data ({stamp})"')
os.system("git push origin main")

print("\n Update complete, data pushed to github.\n")
