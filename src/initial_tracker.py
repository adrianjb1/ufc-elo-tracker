import pandas as pd, os, math
from datetime import datetime

DATA_DIR=os.path.join(os.path.dirname(os.path.dirname(__file__)),"data")

#make sure data exists
os.makedirs(DATA_DIR, exist_ok=True)

#adjustments.csv, contextual_overrides.csv, and manual_champions.csv 
# are required to run this but not posted on the github since i use them experimentally
required_files = [
    "fights_clean2.csv",
    "manual_champions.csv",
    "contextual_overrides.csv",
    "adjustments.csv"
]

missing_files = [f for f in required_files if not os.path.exists(os.path.join(DATA_DIR, f))]

if missing_files:
    print("\nmissing required input files:")
    for f in missing_files:
        print(f" - {f}")
    print("\nPlease ensure all required data files are present in the /data directory before running the tracker.")
    raise SystemExit(1)


FIGHTS_PATH=os.path.join(DATA_DIR,"fights_clean2.csv")
MANUAL_CHAMPS_PATH=os.path.join(DATA_DIR,"manual_champions.csv")
CONTEXTUAL_OVERRIDES_PATH=os.path.join(DATA_DIR,"contextual_overrides.csv")
ADJUSTMENTS_PATH=os.path.join(DATA_DIR,"adjustments.csv")
ELO_CURRENT_PATH=os.path.join(DATA_DIR,"initial_current_elo.csv")
ELO_PEAK_PATH=os.path.join(DATA_DIR,"initial_elo_peak.csv")
FIGHTS_ELO_PATH=os.path.join(DATA_DIR, "fights_with_elo.csv")

initial_elo=1000
base_k=40

def expected(a,b):return 1/(1+10**((b-a)/400))
def update(a,b,score_a,k):
    ea=expected(a,b)
    na=a+k*(score_a-ea)
    nb=b+k*((1-score_a)-(1-ea))
    return na,nb
def get_k(method,fights_done,diff,round_):
    m_mult=1.15 if method in["KO","SUB"]else 1.0
    if method in["KO","SUB"]and str(round_).isdigit()and int(round_)<2:m_mult=1.05
    act_mult=1/(1+0.03*max(0,fights_done-25))
    strength_mult=max(0.7,min(1.3,1+0.0015*diff))
    return base_k*m_mult*act_mult*strength_mult
def apply_decay(e,last,ref):
    if pd.isna(last):return e
    d=(ref-last).days
    if d<=120:return e
    decay_days=d-120
    rate=0.00015
    if d>450:return e*0.85
    return e*math.exp(-rate*decay_days)

def apply_adjustments(final_df,peak_df,today):
    if not os.path.exists(ADJUSTMENTS_PATH):
        return final_df,peak_df
    adj=pd.read_csv(ADJUSTMENTS_PATH)
    for _,r in adj.iterrows():
        name=r["Fighter"]
        elo_mult=r.get("Elo_Multiplier",1.0)
        peak_mult=r.get("Peak_Multiplier",1.0)
        cond=str(r.get("Condition","")).strip()

        if name=="ALL" and cond=="ChampionInactive270+":
            final_df["Elo"]=final_df.apply(
                lambda x:x["Elo"]*elo_mult
                if pd.notna(x["Status"]) and "Champion" in x["Status"] 
                and (today-x["Last_Fight"]).days>270
                else x["Elo"],axis=1)
        elif "inactivity" in cond and name in final_df["Fighter"].values:
            days=(today-final_df.loc[final_df["Fighter"]==name,"Last_Fight"]).dt.days.iloc[0]
            if ">180" in cond and days>180:
                final_df.loc[final_df["Fighter"]==name,"Elo"]*=elo_mult
        elif name!="ALL":
            final_df.loc[final_df["Fighter"]==name,"Elo"]*=elo_mult
            peak_df.loc[peak_df["Fighter"]==name,"Peak Elo"]*=peak_mult
    return final_df,peak_df

f=pd.read_csv(FIGHTS_PATH)
f["Date"]=pd.to_datetime(f["Date"],errors="coerce")
f=f.sort_values("Date").reset_index(drop=True)
elo,peak,fcount={}, {},{}
f["Fighter1_Elo_Start"]=0.0
f["Fighter2_Elo_Start"]=0.0
f["Fighter1_Elo_End"]=0.0
f["Fighter2_Elo_End"]=0.0

records = {}

for i,r in f.iterrows():
    f1,f2=r["Fighter 1"],r["Fighter 2"]
    e1,e2=elo.get(f1,initial_elo),elo.get(f2,initial_elo)
    if f1 not in records: records[f1] = {"W":0,"L":0,"D":0}
    if f2 not in records: records[f2] = {"W":0,"L":0,"D":0}
    if r["Winner"] == f1:
        records[f1]["W"] += 1
        records[f2]["L"] += 1
    elif r["Winner"] == f2:
      records[f2]["W"] += 1
      records[f1]["L"] += 1
    elif str(r["Winner"]).lower() == "draw":
      records[f1]["D"] += 1
      records[f2]["D"] += 1

    fcount[f1]=fcount.get(f1,0)+1
    fcount[f2]=fcount.get(f2,0)+1
    k=get_k(r["method"],fcount[f1],e2-e1,r["Round"])
    f.at[i,"Fighter1_Elo_Start"]=e1
    f.at[i,"Fighter2_Elo_Start"]=e2
    if r["Winner"]==f1:n1,n2=update(e1,e2,1,k)
    elif r["Winner"]==f2:n2,n1=update(e2,e1,1,k)
    elif r["Winner"]=="Draw":n1,n2=e1*0.99,e2
    else:n1,n2=e1,e2
    elo[f1],elo[f2]=n1,n2
    f.at[i,"Fighter1_Elo_End"]=n1
    f.at[i,"Fighter2_Elo_End"]=n2
    peak[f1]=max(peak.get(f1,n1),n1)
    peak[f2]=max(peak.get(f2,n2),n2)

today=f["Date"].max()
d1=f.groupby("Fighter 1")["Date"].max().reset_index().rename(columns={"Fighter 1":"Fighter"})
d2=f.groupby("Fighter 2")["Date"].max().reset_index().rename(columns={"Fighter 2":"Fighter"})
rd=pd.concat([d1,d2],ignore_index=True).groupby("Fighter")["Date"].max().reset_index()
rd.columns=["Fighter","Last_Fight"]

final=pd.DataFrame(list(elo.items()),columns=["Fighter","Elo"]).merge(rd,on="Fighter",how="left")
final["Elo"]=final.apply(lambda x:apply_decay(x["Elo"],x["Last_Fight"],today),axis=1)

champs=pd.read_csv(MANUAL_CHAMPS_PATH)
champs["Confirmed_Since"]=pd.to_datetime(champs.get("Confirmed_Since",None),errors="coerce")
boost_map={
    "Champion":1.18,
    "Transition Champion":1.08,
    "Interim Champion":1.12,
    "Former Champion":1.07,
    "Title Challenger":1.03
}
final=final.merge(champs[["Fighter","Status"]],on="Fighter",how="left")
final["Elo"]=final.apply(lambda x:x["Elo"]*boost_map.get(x["Status"],1.0),axis=1)

peak_df=pd.DataFrame(list(peak.items()),columns=["Fighter","Peak Elo"])

final,peak_df=apply_adjustments(final,peak_df,today)

if os.path.exists(CONTEXTUAL_OVERRIDES_PATH):
    overrides=pd.read_csv(CONTEXTUAL_OVERRIDES_PATH)
    for _,r in overrides.iterrows():
        n=r["Fighter"]
        mult=r.get("Elo_Multiplier",1.0)
        add=r.get("Elo_Add",0.0)
        pmult=r.get("Peak_Multiplier",1.0)
        final.loc[final["Fighter"]==n,"Elo"]*=mult
        final.loc[final["Fighter"]==n,"Elo"]+=add
        peak_df.loc[peak_df["Fighter"]==n,"Peak Elo"]*=pmult

f.to_csv(FIGHTS_ELO_PATH, index=False)


final.sort_values("Elo", ascending=False).to_csv(ELO_CURRENT_PATH, index=False)
peak_df.sort_values("Peak Elo", ascending=False).to_csv(ELO_PEAK_PATH, index=False)

print("UFC Elo Tracker (initial version) complete.")
print("Saved files:")
if FIGHTS_ELO_PATH:
    print(f" - Fight-by-fight Elo data: {FIGHTS_ELO_PATH}")
print(f" - Current Elo leaderboard: {ELO_CURRENT_PATH}")
print(f" - Peak Elo leaderboard: {ELO_PEAK_PATH}")


# intended for frontend, produce JSONs

import json

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


final.sort_values("Elo", ascending=False).to_json(os.path.join(DATA_DIR, "elo_current.json"), orient="records", indent=2)
peak_df.sort_values("Peak Elo", ascending=False).to_json(os.path.join(DATA_DIR, "elo_peak.json"), orient="records", indent=2)

print("\nJSON exports created:")
print(f" - {os.path.join(DATA_DIR, 'elo_current.json')} (current elo)")
print(f" - {os.path.join(DATA_DIR, 'elo_peak.json')} (peak elo)")
