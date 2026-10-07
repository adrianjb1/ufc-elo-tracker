import math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "web"))
sys.path.insert(0, os.path.join(ROOT, "src"))

import pytest
from app import app
from evaluate import win_prob


@pytest.fixture
def client():
    return app.test_client()


def test_current_is_sorted_and_limited(client):
    data = client.get("/api/current?limit=20").get_json()
    assert len(data) == 20
    elos = [f["Elo"] for f in data]
    assert elos == sorted(elos, reverse=True)
    assert {"Fighter", "Elo", "Record", "Status", "Last_Fight", "Weight Class"} <= data[0].keys()


def test_filters(client):
    lw = client.get("/api/current?weight_class=lightweight").get_json()
    assert lw and all(f["Weight Class"] == "Lightweight" for f in lw)
    women = client.get("/api/peak?division_group=women&limit=50").get_json()
    assert women and all(f["Weight Class"].startswith("Women's") for f in women)
    search = client.get("/api/current?search=makhachev").get_json()
    assert [f["Fighter"] for f in search] == ["Islam Makhachev"]


def test_one_champion_per_division(client):
    champs = [f for f in client.get("/api/current").get_json() if (f["Status"] or "").startswith("Champion")]
    divisions = [f["Weight Class"] for f in champs]
    assert len(divisions) == len(set(divisions))


def test_trends_are_chronological_and_clean(client):
    res = client.get("/api/trends/Islam Makhachev")
    assert res.status_code == 200
    assert "NaN" not in res.get_data(as_text=True)
    fights = res.get_json()
    assert [f["Date"] for f in fights] == sorted(f["Date"] for f in fights)
    for prev, cur in zip(fights, fights[1:]):
        assert math.isclose(prev["EloAfter"], cur["EloBefore"], rel_tol=1e-9)


def test_unknown_fighter_is_json_404(client):
    res = client.get("/api/fighter/not a real fighter")
    assert res.status_code == 404
    assert "error" in res.get_json()


def test_meta_and_accuracy(client):
    meta = client.get("/api/meta").get_json()
    assert meta["total_fights"] > 8000 and meta["title_fights"] > 0
    acc = client.get("/api/accuracy").get_json()
    assert 0.5 < acc["experienced"]["accuracy"] < 0.75


def test_retired_fighters_excluded(client):
    names = {f["Fighter"] for f in client.get("/api/current").get_json()}
    assert "Jon Jones" not in names


def test_win_prob():
    assert win_prob(1000, 1000) == 0.5
    assert math.isclose(win_prob(1400, 1000), 10 / 11)
    assert math.isclose(win_prob(1200, 1000) + win_prob(1000, 1200), 1)


def test_enriched_fields_and_total(client):
    res = client.get("/api/current?weight_class=flyweight&limit=5")
    rows = res.get_json()
    assert int(res.headers["X-Total-Count"]) >= len(rows) == 5
    assert [f["Division_Rank"] for f in rows] == [1, 2, 3, 4, 5]
    top = client.get("/api/current?limit=1").get_json()[0]
    assert top["Rank"] == 1 and top["Top_Pct"] == 1 and top["Tier"] == "Elite"
    assert top["Fights"] > 0 and "Last_Change" in top


def test_matchup_latest_and_search(client):
    m = client.get("/api/matchup?a=Islam Makhachev&b=Alexander Volkanovski").get_json()
    assert math.isclose(m["p_a"] + m["p_b"], 1)
    assert m["p_a"] > 0.5 and m["a"]["Fighter"] == "Islam Makhachev"
    assert client.get("/api/matchup?a=nobody&b=Islam Makhachev").status_code == 404

    latest = client.get("/api/latest").get_json()
    assert latest["fights"] and all(f["Winner"] for f in latest["fights"])

    assert "Islam Makhachev" in client.get("/api/fighters?q=makh").get_json()


def test_title_streak_spans_divisions(client):
    islam = client.get("/api/fighter/Islam Makhachev").get_json()
    assert islam["Title_Streak"] >= 7
    assert len(islam["Spark"]) == 11


def test_no_contest_is_not_a_draw(client):
    gane = client.get("/api/fighter/Ciryl Gane").get_json()
    assert gane["Record"].endswith("(1 NC)")
    fights = client.get("/api/trends/Ciryl Gane").get_json()
    nc = [f for f in fights if f["Opponent"] == "Tom Aspinall"]
    assert nc and nc[0]["Result"] == "NC" and nc[0]["EloChange"] == 0
