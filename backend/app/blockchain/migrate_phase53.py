"""
Phase 5.3 Database Migration:
Adds canonical schema version, disruption association, evidence manifest commitment,
and plan hash indexing columns to operational_plans table in SQLite.
Backfills legacy records with explicit 'trustchain-recovery-plan-v1' classification
and computes their original canonical hashes without altering on-chain state.
Idempotent and safe to run multiple times.
"""

import json
import sqlite3
import os
import sys

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from backend.app.blockchain.hash_service import (
    RecoveryPlanHashService,
    SCHEMA_VERSION_V1,
    SCHEMA_VERSION_V2,
)

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../trustchain.db"))

def migrate_phase53(db_path: str = DB_PATH):
    print(f"[*] Starting Phase 5.3 Migration on {db_path}...")
    if not os.path.exists(db_path):
        print(f"[!] Database file '{db_path}' not found. Skipping migration.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Inspect existing columns in operational_plans
    cursor.execute("PRAGMA table_info(operational_plans)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"[*] Existing operational_plans columns: {columns}")

    # 2. Add missing columns safely
    new_cols = [
        ("canonical_schema_version", "TEXT DEFAULT 'trustchain-recovery-plan-v2'"),
        ("disruption_id", "TEXT"),
        ("evidence_manifest_id", "TEXT"),
        ("evidence_manifest_hash", "TEXT"),
        ("canonical_plan_hash", "TEXT"),
        ("is_anchored", "INTEGER DEFAULT 0"),
    ]

    for col_name, col_type in new_cols:
        if col_name not in columns:
            print(f"[+] Adding column '{col_name}' ({col_type}) to operational_plans...")
            cursor.execute(f"ALTER TABLE operational_plans ADD COLUMN {col_name} {col_type}")

    # 3. Create indices for performance
    indices = [
        ("idx_op_disruption_id", "disruption_id"),
        ("idx_op_manifest_hash", "evidence_manifest_hash"),
        ("idx_op_canonical_hash", "canonical_plan_hash"),
    ]
    for idx_name, col_name in indices:
        cursor.execute(
            f"CREATE INDEX IF NOT EXISTS {idx_name} ON operational_plans ({col_name})"
        )

    # 4. Backfill legacy records
    cursor.execute("SELECT id, plan_id, version, organization_id, plan_data_json, canonical_schema_version FROM operational_plans")
    rows = cursor.fetchall()
    print(f"[*] Inspecting {len(rows)} operational plan records for legacy classification...")

    updated_count = 0
    for row_id, plan_id, version, org_id, plan_data_json, schema_ver in rows:
        try:
            plan_data = json.loads(plan_data_json)
        except Exception:
            continue

        needs_update = False
        # If the plan JSON does not have evidence_manifest_hash or explicitly specifies v1,
        # it is a legacy v1 plan.
        if "evidence_manifest_hash" not in plan_data and plan_data.get("schema_version") != SCHEMA_VERSION_V2:
            target_schema = SCHEMA_VERSION_V1
        else:
            target_schema = plan_data.get("schema_version") or SCHEMA_VERSION_V2

        disruption_id = plan_data.get("disruption_id") or plan_data.get("incident_id") or ""
        manifest_id = plan_data.get("evidence_manifest_id")
        manifest_hash = plan_data.get("evidence_manifest_hash") or plan_data.get("manifest_root_hash")

        # Compute authoritative hash according to target schema
        _, canonical_hash = RecoveryPlanHashService.generate_plan_hash(
            plan_data, schema_version=target_schema
        )

        cursor.execute(
            """
            UPDATE operational_plans
            SET canonical_schema_version = ?,
                disruption_id = ?,
                evidence_manifest_id = ?,
                evidence_manifest_hash = ?,
                canonical_plan_hash = ?
            WHERE id = ?
            """,
            (target_schema, disruption_id, manifest_id, manifest_hash, canonical_hash, row_id),
        )
        updated_count += 1
        print(f"    -> Plan {plan_id} V{version} classified as '{target_schema}' with hash {canonical_hash[:16]}...")

    conn.commit()
    conn.close()
    print(f"[OK] Phase 5.3 Migration complete. {updated_count} records checked/updated successfully.\n")

if __name__ == "__main__":
    migrate_phase53()
