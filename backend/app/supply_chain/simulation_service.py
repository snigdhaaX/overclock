import datetime
import json
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.blockchain.hash_service import RecoveryPlanHashService
from .models import Disruption, RecoverySimulationRecord
from .impact_service import DisruptionImpactAnalysisService
from .recommendation_service import RecoveryRecommendationService


class RecoverySimulationService:
    """
    Quantitative Recovery Simulation and Multi-Criteria Optimization Engine.
    Simulates operational delivery timelines, cost curves, and remaining SLA penalties
    against a common baseline scenario. Computes canonical RFC 8785 simulation hashes
    and ranks options deterministically.
    """

    @classmethod
    def calculate_optimization_score(
        cls,
        net_financial_benefit_usd: float,
        baseline_sla_penalty_usd: float,
        time_saved_hours: float,
        baseline_delay_hours: float,
        operational_risk: str = "MEDIUM",
        is_feasible: bool = True,
        recovery_cost_usd: float = 0.0,
        residual_risk_score: Optional[float] = None,
    ) -> float:
        """
        Authoritative Optimization Score (0-100)
        Weights: 40% Financial Benefit, 40% Time Saved, 20% Operational Risk Reduction
        """
        if not is_feasible:
            return 0.0

        # 1. Financial Benefit Score (0-100)
        if baseline_sla_penalty_usd > 0:
            fin_ratio = max(0.0, net_financial_benefit_usd / baseline_sla_penalty_usd)
            fin_score = min(100.0, fin_ratio * 100.0)
        else:
            fin_score = 100.0 if net_financial_benefit_usd >= 0 else max(0.0, 100.0 - (recovery_cost_usd / 1000.0))

        # 2. Time Velocity Score (0-100)
        if baseline_delay_hours > 0:
            time_ratio = max(0.0, min(1.0, time_saved_hours / baseline_delay_hours))
            time_score = time_ratio * 100.0
        else:
            time_score = 100.0 if time_saved_hours >= 0 else 0.0

        # 3. Operational Risk Score (0-100: LOW=100, MEDIUM=60, HIGH=20)
        if residual_risk_score is not None:
            # Normalized 0-100 where 0 risk is 100 score
            risk_score = max(0.0, min(100.0, 100.0 - residual_risk_score))
        else:
            risk_scores = {"LOW": 100.0, "MEDIUM": 60.0, "HIGH": 20.0}
            risk_score = risk_scores.get(operational_risk, 60.0)

        optim_score = round(
            (fin_score * 0.40) + (time_score * 0.40) + (risk_score * 0.20),
            1,
        )
        return optim_score

    @classmethod
    def evaluate_and_simulate(
        cls,
        db: Session,
        disruption: Disruption,
        candidate_recommendations: Optional[List[Dict[str, Any]]] = None,
        custom_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Runs comprehensive comparative simulations for all candidate recovery options.
        """
        # Obtain impact baseline
        impact = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)
        baseline_delay_h = disruption.estimated_delay_hours
        baseline_sla_penalty = impact["total_financial_exposure_usd"]

        # If candidates not provided, generate from recommendation engine
        if not candidate_recommendations:
            candidate_recommendations = RecoveryRecommendationService.generate_recommendations(db, disruption)

        simulated_plans = []
        for rec in candidate_recommendations:
            rec_time_h = rec.get("estimated_recovery_time_hours", 48)
            rec_cost = rec.get("estimated_cost_usd", 15000.0)
            time_saved = max(0, baseline_delay_h - rec_time_h)

            # Calculate remaining SLA penalty after recovery
            # If recovery completes within customer order SLA buffer, remaining penalty is 0;
            # otherwise calculate pro-rated remaining penalty
            if rec_time_h <= 36:
                remaining_penalty = 0.0
            elif rec_time_h <= 48:
                remaining_penalty = round(baseline_sla_penalty * 0.15, 2)
            else:
                remaining_penalty = round(baseline_sla_penalty * 0.40, 2)

            penalty_avoided = max(0.0, baseline_sla_penalty - remaining_penalty)
            net_financial_benefit = round(penalty_avoided - rec_cost, 2)

            # Total Recovery Impact = Recovery Cost + Remaining SLA Penalty (as required)
            total_recovery_impact = round(rec_cost + remaining_penalty, 2)

            # Operational risk penalty for ranking
            risk_penalties = {"LOW": 0.0, "MEDIUM": 10.0, "HIGH": 30.0}
            risk_penalty = risk_penalties.get(rec.get("operational_risk", "MEDIUM"), 15.0)

            # Feasibility check
            is_feasible = rec.get("feasibility_status") == "FEASIBLE"

            # Authoritative Optimization Score (0-100)
            optim_score = cls.calculate_optimization_score(
                net_financial_benefit_usd=net_financial_benefit,
                baseline_sla_penalty_usd=baseline_sla_penalty,
                time_saved_hours=time_saved,
                baseline_delay_hours=baseline_delay_h,
                operational_risk=rec.get("operational_risk", "MEDIUM"),
                is_feasible=is_feasible,
                recovery_cost_usd=rec_cost,
            )

            simulated_plans.append({
                "recommendation_id": rec.get("recommendation_id"),
                "action_type": rec.get("action_type"),
                "action_mask": rec.get("action_mask"),
                "proposed_action": rec.get("proposed_action"),
                "feasibility_status": rec.get("feasibility_status"),
                "feasibility_reason": rec.get("feasibility_reason"),
                "baseline_delay_hours": baseline_delay_h,
                "proposed_recovery_time_hours": rec_time_h,
                "time_saved_hours": time_saved,
                "recovery_cost_usd": rec_cost,
                "baseline_sla_penalty_usd": baseline_sla_penalty,
                "sla_penalty_after_recovery_usd": remaining_penalty,
                "sla_penalty_avoided_usd": penalty_avoided,
                "net_financial_benefit_usd": net_financial_benefit,
                "total_recovery_impact_usd": total_recovery_impact,
                "operational_risk": rec.get("operational_risk"),
                "optimization_score": optim_score,
                "assumptions": rec.get("assumptions", []),
            })

        # Rank plans: Feasible strictly first by descending optimization score
        simulated_plans.sort(
            key=lambda p: (1 if p["feasibility_status"] == "FEASIBLE" else 0, p["optimization_score"]),
            reverse=True,
        )

        for rank_idx, plan in enumerate(simulated_plans, start=1):
            plan["rank"] = rank_idx

        # Deterministic simulation identifier
        sim_id = f"SIM-{disruption.incident_code}-{disruption.organization_id}"

        # Canonical data structure for deterministic hashing
        canonical_sim_data = {
            "simulation_id": sim_id,
            "organization_id": disruption.organization_id,
            "incident_code": disruption.incident_code,
            "baseline_scenario": {
                "delay_hours": baseline_delay_h,
                "sla_financial_penalty_usd": str(baseline_sla_penalty),
                "affected_shipments_count": impact["total_affected_shipments"],
                "affected_customer_orders_count": impact["total_affected_customer_orders"],
            },
            "candidate_plans": [
                {
                    "action_type": p["action_type"],
                    "action_mask": p["action_mask"],
                    "feasibility_status": p["feasibility_status"],
                    "time_saved_hours": p["time_saved_hours"],
                    "recovery_cost_usd": str(p["recovery_cost_usd"]),
                    "total_recovery_impact_usd": str(p["total_recovery_impact_usd"]),
                    "net_financial_benefit_usd": str(p["net_financial_benefit_usd"]),
                    "optimization_score": str(p["optimization_score"]),
                }
                for p in simulated_plans
            ],
        }

        # Generate canonical RFC 8785 simulation hash using existing blockchain hash infrastructure
        _, sim_hash = RecoveryPlanHashService.generate_plan_hash(canonical_sim_data)

        simulation_payload = {
            "simulation_id": sim_id,
            "organization_id": disruption.organization_id,
            "incident_code": disruption.incident_code,
            "baseline_scenario": {
                "delay_hours": baseline_delay_h,
                "sla_financial_penalty_usd": baseline_sla_penalty,
                "affected_shipments_count": impact["total_affected_shipments"],
                "affected_customer_orders_count": impact["total_affected_customer_orders"],
            },
            "candidate_plans": simulated_plans,
            "recommended_best_plan": simulated_plans[0] if simulated_plans else None,
            "simulation_hash": sim_hash,
            "timestamp": "2026-10-30T12:00:00Z",
        }

        # Idempotent database persistence: Upsert rather than unbounded duplication
        sim_record = (
            db.query(RecoverySimulationRecord)
            .filter_by(simulation_id=sim_id, organization_id=disruption.organization_id)
            .first()
        )
        if not sim_record:
            sim_record = RecoverySimulationRecord(
                simulation_id=sim_id,
                organization_id=disruption.organization_id,
                incident_code=disruption.incident_code,
                candidate_plans_count=len(simulated_plans),
                baseline_delay_hours=baseline_delay_h,
                baseline_sla_penalty=baseline_sla_penalty,
                simulation_hash=sim_hash,
                simulation_results_json=json.dumps(simulation_payload),
            )
            db.add(sim_record)
        else:
            sim_record.candidate_plans_count = len(simulated_plans)
            sim_record.baseline_delay_hours = baseline_delay_h
            sim_record.baseline_sla_penalty = baseline_sla_penalty
            sim_record.simulation_hash = sim_hash
            sim_record.simulation_results_json = json.dumps(simulation_payload)
        
        db.commit()
        return simulation_payload

    @classmethod
    def get_simulation_by_id(cls, db: Session, simulation_id: str, organization_id: str) -> Optional[Dict[str, Any]]:
        record = (
            db.query(RecoverySimulationRecord)
            .filter_by(simulation_id=simulation_id, organization_id=organization_id)
            .first()
        )
        if not record:
            return None
        return json.loads(record.simulation_results_json)
