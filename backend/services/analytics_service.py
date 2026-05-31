"""Production analytics aggregations for dashboard and reports."""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from backend.database.models import DetectionLog, InspectionSession

SOURCE_LABELS = {
    "webcam": "Laptop Webcam",
    "ipcam": "Mobile IP Camera",
    "rtsp": "RTSP CCTV",
    "video": "Recorded Video",
}

FILL_KEYS = ["proper_fill", "under_fill", "over_fill"]
LABEL_KEYS = ["label_proper", "label_torn", "label_missing"]


def _range_start(range_key: str) -> Optional[datetime]:
    now = datetime.utcnow()
    if range_key == "today":
        return datetime(now.year, now.month, now.day)
    if range_key == "7d":
        return now - timedelta(days=7)
    if range_key == "30d":
        return now - timedelta(days=30)
    return None


def _apply_range(query, model_ts_col, range_key: str):
    start = _range_start(range_key)
    if start is not None:
        query = query.filter(model_ts_col >= start)
    return query


def _empty_label_counts():
    return {k: 0 for k in FILL_KEYS + LABEL_KEYS}


def get_production_analytics(db: Session, range_key: str = "today", source_type: Optional[str] = None):
    log_q = db.query(DetectionLog)
    log_q = _apply_range(log_q, DetectionLog.timestamp, range_key)
    if source_type:
        session_ids = [
            s.inspection_id
            for s in db.query(InspectionSession.inspection_id)
            .filter(InspectionSession.source_type == source_type)
            .all()
        ]
        if session_ids:
            log_q = log_q.filter(DetectionLog.inspection_id.in_(session_ids))
        else:
            log_q = log_q.filter(DetectionLog.inspection_id == "__none__")

    total = log_q.count()
    passed = log_q.filter(DetectionLog.pass_fail == "PASS").count()
    failed = log_q.filter(DetectionLog.pass_fail.in_(["FAIL", "WARNING"])).count()
    warnings = log_q.filter(DetectionLog.pass_fail == "WARNING").count()

    label_counts = _empty_label_counts()
    for key in FILL_KEYS:
        label_counts[key] = log_q.filter(DetectionLog.fill_status == key).count()
    for key in LABEL_KEYS:
        label_counts[key] = log_q.filter(DetectionLog.label_status == key).count()

    daily_base = db.query(DetectionLog)
    daily_base = _apply_range(daily_base, DetectionLog.timestamp, range_key)
    if source_type:
        session_ids = [
            s.inspection_id
            for s in db.query(InspectionSession.inspection_id)
            .filter(InspectionSession.source_type == source_type)
            .all()
        ]
        if session_ids:
            daily_base = daily_base.filter(DetectionLog.inspection_id.in_(session_ids))
        else:
            daily_base = daily_base.filter(DetectionLog.inspection_id == "__none__")

    daily_rows = (
        daily_base
        .with_entities(
            func.date(DetectionLog.timestamp).label("day"),
            func.count(DetectionLog.id).label("total"),
            func.sum(case((DetectionLog.pass_fail == "PASS", 1), else_=0)).label("passed"),
            func.sum(case((DetectionLog.pass_fail.in_(["FAIL", "WARNING"]), 1), else_=0)).label("failed"),
            func.sum(case((DetectionLog.fill_status == "under_fill", 1), else_=0)).label("under_fill"),
            func.sum(case((DetectionLog.fill_status == "over_fill", 1), else_=0)).label("over_fill"),
            func.sum(case((DetectionLog.label_status == "label_torn", 1), else_=0)).label("label_torn"),
            func.sum(case((DetectionLog.label_status == "label_missing", 1), else_=0)).label("label_missing"),
        )
        .group_by(func.date(DetectionLog.timestamp))
        .order_by(func.date(DetectionLog.timestamp))
        .all()
    )

    by_date = []
    for row in daily_rows:
        by_date.append({
            "date": str(row.day),
            "total": row.total or 0,
            "passed": int(row.passed or 0),
            "failed": int(row.failed or 0),
            "under_fill": int(row.under_fill or 0),
            "over_fill": int(row.over_fill or 0),
            "label_torn": int(row.label_torn or 0),
            "label_missing": int(row.label_missing or 0),
        })

    # By input source
    sessions_q = db.query(InspectionSession)
    sessions_q = _apply_range(sessions_q, InspectionSession.timestamp, range_key)
    if source_type:
        sessions_q = sessions_q.filter(InspectionSession.source_type == source_type)

    source_types = [source_type] if source_type else ["webcam", "ipcam", "rtsp", "video"]
    by_source = []
    for src in source_types:
        src_sessions = sessions_q.filter(InspectionSession.source_type == src).all()
        ids = [s.inspection_id for s in src_sessions]
        sq = db.query(DetectionLog)
        sq = _apply_range(sq, DetectionLog.timestamp, range_key)
        if ids:
            sq = sq.filter(DetectionLog.inspection_id.in_(ids))
        else:
            sq = sq.filter(DetectionLog.inspection_id == "__none__")
        by_source.append({
            "source_type": src,
            "source_label": SOURCE_LABELS.get(src, src),
            "sessions": len(ids),
            "total_scans": sq.count(),
            "passed": sq.filter(DetectionLog.pass_fail == "PASS").count(),
            "failed": sq.filter(DetectionLog.pass_fail.in_(["FAIL", "WARNING"])).count(),
        })

    # Every inspection session with breakdown
    session_rows = sessions_q.order_by(InspectionSession.timestamp.desc()).all()
    by_inspection = []
    for s in session_rows:
        sq = db.query(DetectionLog).filter(DetectionLog.inspection_id == s.inspection_id)
        scans = sq.count()
        by_inspection.append({
            "inspection_id": s.inspection_id,
            "source_type": s.source_type,
            "source_label": SOURCE_LABELS.get(s.source_type, s.source_type),
            "timestamp": s.timestamp.isoformat() if s.timestamp else None,
            "total_scans": scans,
            "passed": sq.filter(DetectionLog.pass_fail == "PASS").count(),
            "failed": sq.filter(DetectionLog.pass_fail.in_(["FAIL", "WARNING"])).count(),
            "proper_fill": sq.filter(DetectionLog.fill_status == "proper_fill").count(),
            "under_fill": sq.filter(DetectionLog.fill_status == "under_fill").count(),
            "over_fill": sq.filter(DetectionLog.fill_status == "over_fill").count(),
            "label_proper": sq.filter(DetectionLog.label_status == "label_proper").count(),
            "label_torn": sq.filter(DetectionLog.label_status == "label_torn").count(),
            "label_missing": sq.filter(DetectionLog.label_status == "label_missing").count(),
            "avg_fps": round(s.avg_fps or 0, 1),
            "avg_latency": round(s.avg_latency or 0, 1),
        })

    # End-of-day snapshot (today UTC)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    eod_q = db.query(DetectionLog).filter(DetectionLog.timestamp >= today_start)
    end_of_day = {
        "date": today_start.strftime("%Y-%m-%d"),
        "total_scans": eod_q.count(),
        "passed": eod_q.filter(DetectionLog.pass_fail == "PASS").count(),
        "failed": eod_q.filter(DetectionLog.pass_fail.in_(["FAIL", "WARNING"])).count(),
        "sessions": db.query(InspectionSession)
        .filter(InspectionSession.timestamp >= today_start)
        .count(),
        "by_source": [],
    }
    for src in ["webcam", "ipcam", "rtsp", "video"]:
        ids = [
            x.inspection_id
            for x in db.query(InspectionSession)
            .filter(
                InspectionSession.timestamp >= today_start,
                InspectionSession.source_type == src,
            )
            .all()
        ]
        if not ids:
            continue
        eq = eod_q.filter(DetectionLog.inspection_id.in_(ids))
        end_of_day["by_source"].append({
            "source_type": src,
            "source_label": SOURCE_LABELS[src],
            "total": eq.count(),
            "failed": eq.filter(DetectionLog.pass_fail.in_(["FAIL", "WARNING"])).count(),
        })

    pass_rate = round((passed / total * 100), 1) if total else 0.0

    return {
        "range": range_key,
        "summary": {
            "total_scans": total,
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "pass_rate_percent": pass_rate,
            "sessions": len(session_rows),
        },
        "label_counts": label_counts,
        "by_date": by_date,
        "by_source": by_source,
        "by_inspection": by_inspection,
        "end_of_day": end_of_day,
    }


def get_session_detail(db: Session, inspection_id: str):
    session = (
        db.query(InspectionSession)
        .filter(InspectionSession.inspection_id == inspection_id)
        .first()
    )
    if not session:
        return None

    logs = (
        db.query(DetectionLog)
        .filter(DetectionLog.inspection_id == inspection_id)
        .order_by(DetectionLog.timestamp.asc())
        .all()
    )

    hourly = {}
    for log in logs:
        hour = log.timestamp.strftime("%H:00") if log.timestamp else "unknown"
        if hour not in hourly:
            hourly[hour] = {"hour": hour, "total": 0, "passed": 0, "failed": 0}
        hourly[hour]["total"] += 1
        if log.pass_fail == "PASS":
            hourly[hour]["passed"] += 1
        else:
            hourly[hour]["failed"] += 1

    return {
        "session": {
            "inspection_id": session.inspection_id,
            "source_type": session.source_type,
            "source_label": SOURCE_LABELS.get(session.source_type, session.source_type),
            "timestamp": session.timestamp.isoformat() if session.timestamp else None,
            "avg_fps": round(session.avg_fps or 0, 1),
            "avg_latency": round(session.avg_latency or 0, 1),
        },
        "totals": {
            "total_scans": len(logs),
            "passed": sum(1 for l in logs if l.pass_fail == "PASS"),
            "failed": sum(1 for l in logs if l.pass_fail in ("FAIL", "WARNING")),
            "proper_fill": sum(1 for l in logs if l.fill_status == "proper_fill"),
            "under_fill": sum(1 for l in logs if l.fill_status == "under_fill"),
            "over_fill": sum(1 for l in logs if l.fill_status == "over_fill"),
            "label_proper": sum(1 for l in logs if l.label_status == "label_proper"),
            "label_torn": sum(1 for l in logs if l.label_status == "label_torn"),
            "label_missing": sum(1 for l in logs if l.label_status == "label_missing"),
        },
        "hourly": list(hourly.values()),
        "logs": [
            {
                "id": l.id,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                "bottle_id": l.bottle_id,
                "fill_status": l.fill_status,
                "label_status": l.label_status,
                "confidence": l.confidence,
                "pass_fail": l.pass_fail,
                "screenshot_path": l.screenshot_path,
            }
            for l in logs[-100:]
        ],
    }
