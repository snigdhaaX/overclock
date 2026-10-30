"""
TRUSTCHAIN — Milestone 6, Phase 5.2 Schema Migration
Creates event_evidence_manifests table and adds manifest columns to external_disruption_events.
Seals initial manifests for existing events with evidence records.
"""

import sqlite3
import os
import sys
import datetime
import hashlib
import json
import jcs

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "trustchain.db")

def run_migration():
    print(f"[MIGRATE 5.2] Connecting to SQLite database at {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print(f"[MIGRATE 5.2] Database not found at {DB_PATH}, exiting.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Add manifest_id and manifest_root_hash to external_disruption_events if not present
    cursor.execute("PRAGMA table_info(external_disruption_events);")
    existing_cols = {row[1] for row in cursor.fetchall()}

    if "manifest_id" not in existing_cols:
        print("[MIGRATE 5.2] Adding column 'manifest_id' to external_disruption_events...")
        cursor.execute("ALTER TABLE external_disruption_events ADD COLUMN manifest_id VARCHAR(64);")

    if "manifest_root_hash" not in existing_cols:
        print("[MIGRATE 5.2] Adding column 'manifest_root_hash' to external_disruption_events...")
        cursor.execute("ALTER TABLE external_disruption_events ADD COLUMN manifest_root_hash VARCHAR(66);")

    # 2. Create event_evidence_manifests table if not present
    print("[MIGRATE 5.2] Ensuring event_evidence_manifests table exists...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_evidence_manifests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manifest_id VARCHAR(64) NOT NULL UNIQUE,
        event_id VARCHAR(64) NOT NULL,
        organization_id VARCHAR(128) NOT NULL,
        schema_version VARCHAR(64) NOT NULL DEFAULT 'trustchain-evidence-manifest-v1',
        evidence_count INTEGER NOT NULL,
        manifest_canonical_json TEXT NOT NULL,
        manifest_root_hash VARCHAR(66) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'SEALED',
        sealed_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY(event_id) REFERENCES external_disruption_events(event_id)
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_event_evidence_manifests_manifest_id ON event_evidence_manifests(manifest_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_event_evidence_manifests_event_id ON event_evidence_manifests(event_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_event_evidence_manifests_organization_id ON event_evidence_manifests(organization_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_event_evidence_manifests_manifest_root_hash ON event_evidence_manifests(manifest_root_hash);")

    # 3. Seal manifests for existing events with evidence
    cursor.execute("SELECT event_id FROM external_disruption_events;")
    events = [r[0] for r in cursor.fetchall()]

    for evt_id in events:
        cursor.execute("SELECT id FROM event_evidence_manifests WHERE event_id = ?;", (evt_id,))
        if cursor.fetchone():
            continue  # Already manifested

        cursor.execute("SELECT id, evidence_type, hash_sha256, source_id, summary, canonical_payload_json FROM event_evidences WHERE event_id = ?;", (evt_id,))
        evidences = cursor.fetchall()
        if not evidences:
            continue

        # Re-canonicalize evidence if needed using jcs
        evidence_items = []
        for row in evidences:
            ev_id, ev_type, ev_hash, src_id, summary, canon_json = row
            try:
                p_dict = json.loads(canon_json) if canon_json else {
                    "event_id": evt_id,
                    "evidence_type": ev_type,
                    "source_id": src_id or "UNKNOWN",
                    "summary": summary,
                }
            except Exception:
                p_dict = {
                    "event_id": evt_id,
                    "evidence_type": ev_type,
                    "source_id": src_id or "UNKNOWN",
                    "summary": summary,
                }

            jcs_bytes = jcs.canonicalize(p_dict)
            jcs_json = jcs_bytes.decode("utf-8")
            calc_hash = hashlib.sha256(jcs_bytes).hexdigest()

            cursor.execute("UPDATE event_evidences SET canonical_payload_json = ?, hash_sha256 = ?, integrity_status = 'VERIFIED' WHERE id = ?;", (jcs_json, calc_hash, ev_id))
            evidence_items.append({
                "evidence_type": ev_type,
                "hash_sha256": calc_hash,
                "source_id": src_id or "UNKNOWN",
            })

        evidence_items.sort(key=lambda x: x["hash_sha256"])
        manifest_obj = {
            "event_id": evt_id,
            "evidence_count": len(evidence_items),
            "evidence_items": evidence_items,
            "organization_id": "ORG-APEX-GLOBAL",
            "schema_version": "trustchain-evidence-manifest-v1",
        }
        man_bytes = jcs.canonicalize(manifest_obj)
        man_json = man_bytes.decode("utf-8")
        man_root_hash = hashlib.sha256(man_bytes).hexdigest()
        man_id = f"MAN-{evt_id}"
        now_iso = datetime.datetime.utcnow().isoformat()

        cursor.execute("""
        INSERT INTO event_evidence_manifests (
            manifest_id, event_id, organization_id, schema_version,
            evidence_count, manifest_canonical_json, manifest_root_hash,
            status, sealed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SEALED', ?, ?);
        """, (man_id, evt_id, "ORG-APEX-GLOBAL", "trustchain-evidence-manifest-v1", len(evidence_items), man_json, man_root_hash, now_iso, now_iso))

        cursor.execute("UPDATE external_disruption_events SET manifest_id = ?, manifest_root_hash = ? WHERE event_id = ?;", (man_id, man_root_hash, evt_id))
        print(f"[MIGRATE 5.2] Sealed manifest {man_id} (root: {man_root_hash[:16]}...) with {len(evidence_items)} evidence item(s).")

    conn.commit()
    conn.close()
    print("[MIGRATE 5.2] Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
