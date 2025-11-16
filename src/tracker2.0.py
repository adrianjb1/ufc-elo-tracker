import pandas as pd, os, math
from datetime import datetime

DATA_DIR=os.path.join(os.path.dirname(os.path.dirname(__file__)),"data")
os.makedirs(DATA_DIR, exist_ok=True)

FIGHTS_PATH=os.path.join(DATA_DIR,"fights_enhanced.csv")
MANUAL_CHAMPS_PATH=os.path.join(DATA_DIR,"manual_champions.csv")
ELO_CURRENT_PATH=os.path.join(DATA_DIR,"current_elo_2.0.csv")
ELO_PEAK_PATH=os.path.join(DATA_DIR,"peak_elo_2.0.csv")
FIGHTS_ELO_PATH=os.path.join(DATA_DIR,"fights_with_elo_2.0.csv")

initial_elo=1000
base_k=40

def expected(a,b):
    return 1/(1+10**((b-a)/400))

def update(a,b,score_a,k):
    ea=expected(a,b)
    na=a+k*(score_a-ea)
    nb=b+k*((1-score_a)-(1-ea))
    return na,nb



def get_enhanced_k_factor(method, fights_done, elo_diff, round_, is_title, is_main, opponent_avg_elo, title_defense_streak=0):
    m_mult = 1.10 if method in ["KO","SUB"] else 1.0
    if method in ["KO","SUB"] and str(round_).isdigit() and int(round_) < 2:
        m_mult = 1.03

    act_mult = 1 / (1 + 0.03 * max(0, fights_done - 25))
    strength_mult = max(0.85, min(1.08, 1 + 0.0005 * elo_diff))

    title_mult = 1.65 if is_title else 1.0
    main_mult = 1.10 if is_main and not is_title else 1.0

    if is_title:
        quality_mult = 1.00
        defense_bonus = min(2.50, title_defense_streak * 0.35 + (title_defense_streak ** 1.3) * 0.04)
        quality_mult += defense_bonus
    else:
        quality_mult = 1.0 + (opponent_avg_elo - 1000) / 3000
        quality_mult = max(0.8, min(1.2, quality_mult))

    return base_k * m_mult * act_mult * strength_mult * title_mult * main_mult * quality_mult

def apply_decay(e, last, ref, is_champion=False):
    if pd.isna(last):
        return e
    d = (ref - last).days

    if is_champion:
        if d <= 365:
            return e
        decay_days = d - 365
        rate = 0.00005
        return e * math.exp(-rate * decay_days)
    else:
        if d <= 120:
            return e
        # Progressive decay for retired/inactive fighters
        decay_days = d - 120

        if d > 1825:  # 5+ years (retired)
            return e * 0.40  # 60% penalty
        elif d > 1095:  # 3-5 years (likely retired)
            return e * 0.55  # 45% penalty
        elif d > 730:  # 2-3 years (very inactive)
            return e * 0.70  # 30% penalty
        elif d > 550:  # 1.5-2 years (inactive)
            return e * 0.82  # 18% penalty
        else:
            rate = 0.0010
            return e * math.exp(-rate * decay_days)

def get_championship_boost(is_champion, title_defenses, is_former_champion):
    if is_champion:
        base = 1.18
        defense_bonus = min(0.18, title_defenses * 0.03)
        return base + defense_bonus
    elif is_former_champion:
        return 1.07
    return 1.0

f = pd.read_csv(FIGHTS_PATH)
f["Date"] = pd.to_datetime(f["Date"], errors="coerce")
f = f.sort_values("Date").reset_index(drop=True)

manual_champs = pd.read_csv(MANUAL_CHAMPS_PATH)
manual_champs_dict = {}
for _, row in manual_champs.iterrows():
    manual_champs_dict[row["Fighter"]] = row["Status"]



elo, peak, fcount = {}, {}, {}
elo_history = {}
records = {}
current_champions = {}  # weight_class -> current_champion_name
title_defenses = {}  # fighter_name -> number of defenses
former_champions = set()

f["Fighter1_Elo_Start"] = 0.0
f["Fighter2_Elo_Start"] = 0.0
f["Fighter1_Elo_End"] = 0.0
f["Fighter2_Elo_End"] = 0.0

for i, r in f.iterrows():
    f1, f2 = r["Fighter 1"], r["Fighter 2"]
    e1, e2 = elo.get(f1, initial_elo), elo.get(f2, initial_elo)

    if f1 not in elo_history:
        elo_history[f1] = []
    if f2 not in elo_history:
        elo_history[f2] = []

    elo_history[f1].append(e1)
    elo_history[f2].append(e2)

    avg_opp_elo_f1 = sum(elo_history[f1]) / len(elo_history[f1]) if elo_history[f1] else 1000
    avg_opp_elo_f2 = sum(elo_history[f2]) / len(elo_history[f2]) if elo_history[f2] else 1000

    if f1 not in records:
        records[f1] = {"W": 0, "L": 0, "D": 0}
    if f2 not in records:
        records[f2] = {"W": 0, "L": 0, "D": 0}

    winner = r["Winner"]
    if winner == f1:
        records[f1]["W"] += 1
        records[f2]["L"] += 1
    elif winner == f2:
        records[f2]["W"] += 1
        records[f1]["L"] += 1
    elif str(winner).lower() == "draw":
        records[f1]["D"] += 1
        records[f2]["D"] += 1

    fcount[f1] = fcount.get(f1, 0) + 1
    fcount[f2] = fcount.get(f2, 0) + 1

    
    #tuf filter? might have to improve some stuff
    false_positive_fighters = ["Juan Espino", "Justin Frazier", "Macy Chiasson", "Pannie Kianzad",
                               "Michael Trizano", "Joe Giannetti", "Guangyou Ning", "Jianping Yang",
                               "Diego Brandao", "Dennis Bermudez", "Rony Jason", "Godofredo Pepey",
                               "Ramsey Nijem"]  

    
    is_tuf_fight = (f1 == "Tony Ferguson" and f2 == "Ramsey Nijem") or (f1 == "Ramsey Nijem" and f2 == "Tony Ferguson")

    is_false_positive = (f1 in false_positive_fighters or f2 in false_positive_fighters) or is_tuf_fight

    is_title = r["Is_Title_Fight"] and not is_false_positive
    is_main = r["Is_Main_Event"]
    weight_class = r["Weight Class"]

    current_defense_streak = 0
    if is_title and current_champions.get(weight_class) == f1:
        current_defense_streak = title_defenses.get(f1, 0)

    k = get_enhanced_k_factor(r["method"], fcount[f1], e2 - e1, r["Round"], is_title, is_main, avg_opp_elo_f2, current_defense_streak)

    f.at[i, "Fighter1_Elo_Start"] = e1
    f.at[i, "Fighter2_Elo_Start"] = e2

    if winner == f1:
        n1, n2 = update(e1, e2, 1, k)

        if is_title:
            old_champ = current_champions.get(weight_class)
            if old_champ and old_champ != f1:
                former_champions.add(old_champ)
                title_defenses[f1] = 0
            elif old_champ == f1:
                title_defenses[f1] = title_defenses.get(f1, 0) + 1
            else:
                title_defenses[f1] = 0
            current_champions[weight_class] = f1

    elif winner == f2:
        n2, n1 = update(e2, e1, 1, k)

        if is_title:
            old_champ = current_champions.get(weight_class)
            if old_champ and old_champ != f2:
                former_champions.add(old_champ)
                title_defenses[f2] = 0
            elif old_champ == f2:
                title_defenses[f2] = title_defenses.get(f2, 0) + 1
            else:
                title_defenses[f2] = 0
            current_champions[weight_class] = f2
    elif winner == "Draw":
        n1, n2 = e1 * 0.99, e2 * 0.99
    else:
        n1, n2 = e1, e2

    elo[f1], elo[f2] = n1, n2
    f.at[i, "Fighter1_Elo_End"] = n1
    f.at[i, "Fighter2_Elo_End"] = n2
    peak[f1] = max(peak.get(f1, n1), n1)
    peak[f2] = max(peak.get(f2, n2), n2)

today = f["Date"].max()
d1 = f.groupby("Fighter 1")["Date"].max().reset_index().rename(columns={"Fighter 1": "Fighter"})
d2 = f.groupby("Fighter 2")["Date"].max().reset_index().rename(columns={"Fighter 2": "Fighter"})
rd = pd.concat([d1, d2], ignore_index=True).groupby("Fighter")["Date"].max().reset_index()
rd.columns = ["Fighter", "Last_Fight"]

f1_weight = f[["Fighter 1", "Weight Class", "Date"]].rename(columns={"Fighter 1": "Fighter"})
f2_weight = f[["Fighter 2", "Weight Class", "Date"]].rename(columns={"Fighter 2": "Fighter"})
weight_data = pd.concat([f1_weight, f2_weight], ignore_index=True).sort_values("Date").groupby("Fighter").last().reset_index()
weight_data = weight_data[["Fighter", "Weight Class"]]

final = pd.DataFrame(list(elo.items()), columns=["Fighter", "Elo"]).merge(rd, on="Fighter", how="left").merge(weight_data, on="Fighter", how="left")

final["Is_Champion"] = final["Fighter"].apply(
    lambda fighter: manual_champs_dict.get(fighter) in ["Champion", "Transition Champion"]
)

final["Elo"] = final.apply(lambda x: apply_decay(x["Elo"], x["Last_Fight"], today, x["Is_Champion"]), axis=1)
final["Title_Defenses"] = final.apply(
    lambda row: title_defenses.get(row["Fighter"], 0) if row["Is_Champion"] else 0,
    axis=1
)
final["Is_Former_Champion"] = final["Fighter"].apply(
    lambda fighter: fighter in former_champions and not manual_champs_dict.get(fighter) in ["Champion", "Transition Champion"]
)

final["Elo"] = final.apply(
    lambda x: x["Elo"] * get_championship_boost(x["Is_Champion"], x["Title_Defenses"], x["Is_Former_Champion"]),
    axis=1
)

# Apply undefeated champion bonus to current Elo as well
def is_current_undefeated_champ(fighter_name, is_champ):
    if fighter_name not in records:
        return False
    return records[fighter_name]["L"] == 0 and records[fighter_name]["W"] >= 8 and is_champ

final["Elo"] = final.apply(
    lambda x: x["Elo"] * 1.08 if is_current_undefeated_champ(x["Fighter"], x["Is_Champion"]) else x["Elo"],
    axis=1
)

final["Status"] = final.apply(
    lambda x: f"Champion ({x['Title_Defenses']} defenses)" if x["Is_Champion"]
    else ("Former Champion" if x["Is_Former_Champion"] else None),
    axis=1
)


multi_division_champs = set()
title_wins_by_fighter_class = {}
undisputed_champions = set()  

for i, r in f.iterrows():
    if r["Is_Title_Fight"]:
        f1, f2 = r["Fighter 1"], r["Fighter 2"]
        winner = r["Winner"]
        wc = r["Weight Class"]

        if winner == f1 or winner == f2:
            if winner not in title_wins_by_fighter_class:
                title_wins_by_fighter_class[winner] = set()
            title_wins_by_fighter_class[winner].add(wc)

            if len(title_wins_by_fighter_class[winner]) >= 2:
                multi_division_champs.add(winner)

           
            if winner in title_defenses and title_defenses.get(winner, 0) >= 1:
                undisputed_champions.add(winner)

peak_df = pd.DataFrame(list(peak.items()), columns=["Fighter", "Peak Elo"]).merge(weight_data, on="Fighter", how="left")

# special achievement bonus
# multi-divison champ
peak_df["Peak Elo"] = peak_df.apply(
    lambda x: x["Peak Elo"] * 1.08 if x["Fighter"] in multi_division_champs else x["Peak Elo"],
    axis=1
)

# 2. undefeated champ bonus
def is_undefeated_champ(fighter_name):
    if fighter_name not in records:
        return False
    return records[fighter_name]["L"] == 0 and records[fighter_name]["W"] >= 10 and fighter_name in former_champions

peak_df["Peak Elo"] = peak_df.apply(
    lambda x: x["Peak Elo"] * 1.10 if is_undefeated_champ(x["Fighter"]) else x["Peak Elo"],
    axis=1
)

# 3. certain loss penalty 
def get_loss_penalty(fighter_name, is_multi_div):
    if fighter_name not in records or is_multi_div:  # multi-div champ excluded
        return 1.0
    losses = records[fighter_name]["L"]
    if losses >= 9:
        return 0.70  # 30% penalty for 9+ losses (cough cough Tony)
    elif losses >= 7:
        return 0.86  # 14% penalty for 7-8 losses
    elif losses >= 5:
        return 0.92  # 8% penalty for 5-6 losses
    elif losses >= 3:
        return 0.97  # 3% penalty for 3-4 losses
    return 1.0

peak_df["Peak Elo"] = peak_df.apply(
    lambda x: x["Peak Elo"] * get_loss_penalty(x["Fighter"], x["Fighter"] in multi_division_champs),
    axis=1
)

women_divisions = ["Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
                   "Women's Featherweight"]

peak_df["Peak Elo"] = peak_df.apply(
    lambda x: x["Peak Elo"] * 0.90 if x["Weight Class"] in women_divisions else x["Peak Elo"],
    axis=1
)


def never_won_undisputed_title(fighter_name):
    if fighter_name in undisputed_champions:
        return False
    if fighter_name in manual_champs_dict and manual_champs_dict[fighter_name] in ["Champion", "Transition Champion"]:
        return False
    if fighter_name in records:
        losses = records[fighter_name]["L"]
        return losses >= 5  
    return False

peak_df["Peak Elo"] = peak_df.apply(
    lambda x: x["Peak Elo"] * 0.88 if never_won_undisputed_title(x["Fighter"]) else x["Peak Elo"],
    axis=1
)

peak_df["Peak Elo"] = peak_df["Peak Elo"] * 1.08

final["Record"] = final["Fighter"].apply(
    lambda x: f"{records.get(x,{'W':0,'L':0,'D':0})['W']}-"
              f"{records.get(x,{'W':0,'L':0,'D':0})['L']}-"
              f"{records.get(x,{'W':0,'L':0,'D':0})['D']}"
)
peak_df["Record"] = peak_df["Fighter"].apply(
    lambda x: f"{records.get(x,{'W':0,'L':0,'D':0})['W']}-"
              f"{records.get(x,{'W':0,'L':0,'D':0})['L']}-"
              f"{records.get(x,{'W':0,'L':0,'D':0})['D']}"
)

retirement_threshold_days=730
final["days_inactive"]=(today-final["Last_Fight"]).dt.days
active_fighters=final[final["days_inactive"]<retirement_threshold_days].copy()

f.to_csv(FIGHTS_ELO_PATH, index=False)
active_fighters.drop(columns=["days_inactive"]).sort_values("Elo",ascending=False).to_csv(ELO_CURRENT_PATH,index=False)
peak_df.sort_values("Peak Elo",ascending=False).to_csv(ELO_PEAK_PATH,index=False)

retired_count=len(final)-len(active_fighters)
print("UFC Elo Tracker 2 complete.")
print("Saved files:")
print(f" - Fight-by-fight Elo data: {FIGHTS_ELO_PATH}")
print(f" - Current Elo leaderboard: {ELO_CURRENT_PATH}")
print(f" - Peak Elo leaderboard: {ELO_PEAK_PATH}")
print(f"\nFiltered {retired_count} retired fighters (inactive {retirement_threshold_days}+ days) from current Elo")

active_json=active_fighters[["Fighter","Elo","Last_Fight","Weight Class","Status","Record"]].copy()
active_json["Last_Fight"]=active_json["Last_Fight"].astype('int64')//10**6

active_json.sort_values("Elo",ascending=False).to_json(os.path.join(DATA_DIR,"current_elo_2.0.json"),orient="records",indent=2)
peak_df.sort_values("Peak Elo",ascending=False).to_json(os.path.join(DATA_DIR,"peak_elo_2.0.json"),orient="records",indent=2)

print("\nJSON exports created:")
print(f" - {os.path.join(DATA_DIR, 'current_elo_2.0.json')} (current elo)")
print(f" - {os.path.join(DATA_DIR, 'peak_elo_2.0.json')} (peak elo)")

print(f"\nDetected {sum(active_fighters['Is_Champion'])} current champions")
print(f"Detected {len(former_champions)} former champions")
print(f"Identified {f['Is_Title_Fight'].sum()} title fights")
