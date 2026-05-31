import datetime
import os
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from backend.database.db import Base, engine

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="operator") # operator, admin

class InspectionSession(Base):
    __tablename__ = "inspection_sessions"

    inspection_id = Column(String, primary_key=True, index=True)
    source_type = Column(String, nullable=False) # webcam, ipcam, rtsp, video
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    total_detected = Column(Integer, default=0)
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    avg_fps = Column(Float, default=0.0)
    avg_latency = Column(Float, default=0.0)

class DetectionLog(Base):
    __tablename__ = "detection_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    inspection_id = Column(String, nullable=True) # Linked Inspection ID (e.g. WC001)
    bottle_id = Column(Integer, nullable=True) # ID from tracking
    fill_status = Column(String, nullable=False) # proper_fill, under_fill, over_fill
    label_status = Column(String, nullable=False) # label_proper, label_torn, label_missing
    confidence = Column(Float, nullable=False)
    pass_fail = Column(String, nullable=False) # PASS, FAIL, WARNING
    screenshot_path = Column(String, nullable=True)

class MetricSummary(Base):
    __tablename__ = "metric_summaries"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    inspection_id = Column(String, nullable=True)
    fps = Column(Float, nullable=False)
    latency = Column(Float, nullable=False)
    total_detected = Column(Integer, default=0)
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)

def _migrate_sqlite_schema():
    """Add columns introduced after first deploy (SQLite has no auto-migrate)."""
    if not str(engine.url).startswith("sqlite"):
        return
    import sqlite3

    db_path = str(engine.url).replace("sqlite:///", "")
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.isabs(db_path):
        db_path = os.path.join(backend_dir, db_path.lstrip("./"))
    paths = [db_path]
    root_db = os.path.join(os.path.dirname(backend_dir), "seewise.db")
    if root_db not in paths and os.path.isfile(root_db):
        paths.append(root_db)

    for path in paths:
        if not os.path.isfile(path):
            continue
        _migrate_db_file(path)


def _migrate_db_file(db_path: str):
    import sqlite3

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Migrate detection_logs table
    cur.execute("PRAGMA table_info(detection_logs)")
    cols = {row[1] for row in cur.fetchall()}
    if "inspection_id" not in cols:
        cur.execute("ALTER TABLE detection_logs ADD COLUMN inspection_id VARCHAR")
        print(f"[SeeWise DB] Migrated detection_logs.inspection_id in {db_path}")

    # Migrate metric_summaries table
    cur.execute("PRAGMA table_info(metric_summaries)")
    cols_metrics = {row[1] for row in cur.fetchall()}
    if cols_metrics and "inspection_id" not in cols_metrics:
        cur.execute("ALTER TABLE metric_summaries ADD COLUMN inspection_id VARCHAR")
        print(f"[SeeWise DB] Migrated metric_summaries.inspection_id in {db_path}")

    conn.commit()
    conn.close()


# Create all tables on import
def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_schema()

    # Pre-populate with admin user if not exists
    from sqlalchemy.orm import Session
    from passlib.hash import bcrypt
    
    db = Session(bind=engine)
    admin_exists = db.query(User).filter(User.email == "admin@seewise.com").first()
    if not admin_exists:
        hashed_password = bcrypt.hash("seewise123")
        admin_user = User(
            email="admin@seewise.com",
            password_hash=hashed_password,
            full_name="SeeWise Administrator",
            role="admin"
        )
        db.add(admin_user)
        db.commit()
    db.close()
