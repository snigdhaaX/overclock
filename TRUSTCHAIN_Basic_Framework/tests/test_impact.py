from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from types import SimpleNamespace
from backend.app.services.impact import calculate_risk, risk_band


def test_risk_score_uses_documented_weights_and_is_bounded():
    order = SimpleNamespace(
        priority="tier_1",
        sla_deadline=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    result = calculate_risk(order, exposed_units=50, delay_days=7, line_quantity=100)
    assert 0 <= result["score"] <= 100
    assert result["components"]["shortage_severity"] == 50
    assert result["components"]["disruption_impact"] == 50
    assert result["components"]["business_priority"] == 100


def test_risk_bands():
    assert risk_band(10) == "low"
    assert risk_band(25) == "moderate"
    assert risk_band(50) == "high"
    assert risk_band(75) == "critical"
