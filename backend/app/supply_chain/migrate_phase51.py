import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "../../../trustchain.db")
db_path = os.path.abspath(db_path)

if os.path.exists(db_path):
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # Migrate intelligence_sources
    cols_src = [c[1] for c in cur.execute("PRAGMA table_info(intelligence_sources)").fetchall()]
    new_src = [
        ("connection_status", "TEXT DEFAULT 'DEMO'"),
        ("last_attempted_at", "DATETIME"),
        ("last_successful_at", "DATETIME"),
        ("consecutive_failures", "INTEGER DEFAULT 0"),
        ("last_event_timestamp", "DATETIME"),
        ("events_processed_count", "INTEGER DEFAULT 0"),
        ("duplicates_count", "INTEGER DEFAULT 0"),
        ("rejected_count", "INTEGER DEFAULT 0")
    ]
    for col, typ in new_src:
        if col not in cols_src:
            cur.execute(f"ALTER TABLE intelligence_sources ADD COLUMN {col} {typ}")
            print(f"Added column {col} to intelligence_sources")

    # Migrate event_evidences
    cols_ev = [c[1] for c in cur.execute("PRAGMA table_info(event_evidences)").fetchall()]
    new_ev = [
        ("canonical_payload_json", "TEXT"),
        ("source_id", "TEXT"),
        ("source_event_timestamp", "DATETIME"),
        ("ingestion_timestamp", "DATETIME"),
        ("integrity_status", "TEXT DEFAULT 'VERIFIED'")
    ]
    for col, typ in new_ev:
        if col not in cols_ev:
            cur.execute(f"ALTER TABLE event_evidences ADD COLUMN {col} {typ}")
            print(f"Added column {col} to event_evidences")

    con.commit()
    con.close()
    print("Migration finished cleanly.")
else:
    print(f"Database at {db_path} does not exist yet; will be created on init.")
