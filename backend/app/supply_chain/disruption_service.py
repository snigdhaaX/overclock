import datetime
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from .models import Disruption, Shipment, DisruptionShipment


class DisruptionIntelligenceService:
    """
    Modular AI Disruption Intelligence Engine.
    Processes disruption events, classifies geographic and operational risk,
    and correlates disruptions with affected shipments, routes, and suppliers.
    """

    CORRIDOR_KEYWORDS = {
        "Suez Canal / Red Sea Gateway": [
            "suez", "red sea", "great bitter lake", "bab el-mandeb", "sinai", "port said"
        ],
        "Malacca Strait Corridor": [
            "malacca", "singapore strait", "klang", "tanjung pelepas"
        ],
        "South China Sea Corridor": [
            "south china sea", "taiwan strait", "kaohsiung", "shenzhen", "yantian"
        ],
        "Panama Canal Transit": [
            "panama", "gatun", "balboa", "colon"
        ],
        "North Sea / English Channel Gateway": [
            "rotterdam", "antwerp", "hamburg", "english channel", "north sea"
        ],
    }

    SEVERITY_THRESHOLDS = {
        "CRITICAL": {"min_delay": 72, "keywords": ["blockage", "closed", "halted", "stoppage", "war", "severe bottleneck", "grounded"]},
        "HIGH": {"min_delay": 36, "keywords": ["strike", "typhoon", "congestion", "delayed", "embargo", "curfew"]},
        "MEDIUM": {"min_delay": 12, "keywords": ["storm", "advisory", "slowdown", "maintenance", "inspection"]},
        "LOW": {"min_delay": 0, "keywords": ["advisory", "minor", "clear"]},
    }

    @classmethod
    def classify_disruption(
        cls,
        description: str,
        category: Optional[str] = None,
        reported_delay_hours: int = 0,
        source: str = "AI_SATELLITE_AIS_MONITORING",
    ) -> Dict[str, Any]:
        """
        Classifies disruption category, geographic region, severity, confidence,
        and affected transport corridors using explainable rule-based heuristics.
        """
        desc_lower = description.lower()

        # 1. Category Detection
        detected_category = category or "TRANSPORTATION_DELAY"
        if any(w in desc_lower for w in ["port", "congestion", "berth", "anchorage", "choke-point", "bottleneck", "canal", "convoy"]):
            detected_category = "PORT_CONGESTION"
        elif any(w in desc_lower for w in ["typhoon", "cyclone", "hurricane", "storm", "fog"]):
            detected_category = "WEATHER"
        elif any(w in desc_lower for w in ["strike", "union", "walkout", "labor"]):
            detected_category = "LABOR_STRIKE"
        elif any(w in desc_lower for w in ["geopolitical", "conflict", "missile", "drone", "sanction"]):
            detected_category = "GEOPOLITICAL"
        elif any(w in desc_lower for w in ["insolvency", "bankruptcy", "supplier shutdown", "facility fire"]):
            detected_category = "SUPPLIER_SHUTDOWN"

        # 2. Geographic Region Resolution
        detected_region = "Global Maritime / Aerial Corridor"
        for region, keywords in cls.CORRIDOR_KEYWORDS.items():
            if any(k in desc_lower for k in keywords):
                detected_region = region
                break

        # 3. Severity Classification
        severity = "LOW"
        matched_reasons = []
        for sev, criteria in cls.SEVERITY_THRESHOLDS.items():
            if reported_delay_hours >= criteria["min_delay"] or any(k in desc_lower for k in criteria["keywords"]):
                severity = sev
                matched_reasons.append(f"Matched {sev} criteria: delay >= {criteria['min_delay']}h or keywords")
                break

        # 4. Confidence Score (Based on corroborating metrics and detection source)
        confidence = 0.85
        if "satellite" in source.lower() or "ais" in source.lower():
            confidence += 0.08
        if reported_delay_hours > 24:
            confidence += 0.04
        confidence = min(round(confidence, 2), 0.98)

        return {
            "category": detected_category,
            "geographic_region": detected_region,
            "severity": severity,
            "estimated_delay_hours": reported_delay_hours,
            "confidence_score": confidence,
            "detection_source": source,
            "classification_reasoning": matched_reasons,
        }

    @classmethod
    def correlate_affected_shipments(
        cls,
        db: Session,
        disruption: Disruption,
    ) -> List[Shipment]:
        """
        Discovers and links shipments in transit through the disruption's geographic corridor.
        """
        region = disruption.geographic_region
        keywords = cls.CORRIDOR_KEYWORDS.get(region, [region.lower()])

        # Query active in-transit shipments belonging to this organization
        active_shipments = (
            db.query(Shipment)
            .filter(
                Shipment.organization_id == disruption.organization_id,
                Shipment.status.in_(["IN_TRANSIT", "DELAYED", "CREATED"]),
            )
            .all()
        )

        matched_shipments = []
        for shp in active_shipments:
            location_str = f"{shp.current_location} {shp.route_info or ''} {shp.origin} {shp.destination}".lower()
            if any(k.lower() in location_str for k in keywords):
                matched_shipments.append(shp)

                # Link if not already associated
                existing_assoc = (
                    db.query(DisruptionShipment)
                    .filter_by(disruption_id=disruption.id, shipment_id=shp.id)
                    .first()
                )
                if not existing_assoc:
                    assoc = DisruptionShipment(
                        disruption_id=disruption.id,
                        shipment_id=shp.id,
                        impact_summary=f"Shipment active in corridor '{region}' with estimated delay {disruption.estimated_delay_hours}h.",
                    )
                    db.add(assoc)
                    shp.status = "DELAYED"
                    shp.delay_hours = max(shp.delay_hours, disruption.estimated_delay_hours)

        db.commit()
        return matched_shipments
