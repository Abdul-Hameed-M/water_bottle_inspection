from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database.db import get_db
from backend.database.models import DetectionLog, MetricSummary, InspectionSession
from backend.services.report import ReportService
from backend.services.analytics_service import get_production_analytics, get_session_detail
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/sessions")
def get_inspection_sessions(db: Session = Depends(get_db)):
    """
    Returns the list of unique inspection sessions (for the Live Inspection History Panel)
    """
    sessions = db.query(InspectionSession).order_by(InspectionSession.timestamp.desc()).all()
    items = []
    for s in sessions:
        items.append({
            "inspection_id": s.inspection_id,
            "source_type": s.source_type,
            "timestamp": s.timestamp.isoformat(),
            "total_detected": s.total_detected,
            "passed_count": s.passed_count,
            "failed_count": s.failed_count,
            "avg_fps": round(s.avg_fps, 1),
            "avg_latency": round(s.avg_latency, 1)
        })
    return items


@router.get("/production")
def get_production_dashboard(
    range: str = Query("today", pattern="^(today|7d|30d|all)$"),
    source_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Production analytics: date trends, per-source totals, every inspection ID,
    label breakdown, and end-of-day summary.
    """
    return get_production_analytics(db, range_key=range, source_type=source_type)


@router.get("/session/{inspection_id}")
def get_inspection_session_detail(inspection_id: str, db: Session = Depends(get_db)):
    detail = get_session_detail(db, inspection_id)
    if not detail:
        return {"error": "Session not found"}
    return detail


@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns high-level metric summaries for dashboard cards and charts
    """
    # Card 1: Total bottles scanned
    total_bottles = db.query(func.count(DetectionLog.id)).scalar() or 0
    
    # Card 2 & 3: Pass/Fail breakdown
    passed_count = db.query(func.count(DetectionLog.id)).filter(DetectionLog.pass_fail == "PASS").scalar() or 0
    failed_count = db.query(func.count(DetectionLog.id)).filter(DetectionLog.pass_fail.in_(["FAIL", "WARNING"])).scalar() or 0
    
    # Defect breakdowns
    under_fill = db.query(func.count(DetectionLog.id)).filter(DetectionLog.fill_status == "under_fill").scalar() or 0
    over_fill = db.query(func.count(DetectionLog.id)).filter(DetectionLog.fill_status == "over_fill").scalar() or 0
    proper_fill = db.query(func.count(DetectionLog.id)).filter(DetectionLog.fill_status == "proper_fill").scalar() or 0
    
    label_torn = db.query(func.count(DetectionLog.id)).filter(DetectionLog.label_status == "label_torn").scalar() or 0
    label_missing = db.query(func.count(DetectionLog.id)).filter(DetectionLog.label_status == "label_missing").scalar() or 0
    label_proper = db.query(func.count(DetectionLog.id)).filter(DetectionLog.label_status == "label_proper").scalar() or 0
    
    # Card 4 & 5: Average FPS and Latency from MetricSummary
    avg_fps = db.query(func.avg(MetricSummary.fps)).scalar() or 30.0
    avg_latency = db.query(func.avg(MetricSummary.latency)).scalar() or 12.5
    
    # Real-time chart data: Fetch last 20 metric updates
    metrics_history = db.query(MetricSummary).order_by(MetricSummary.timestamp.desc()).limit(20).all()
    chart_data = []
    for m in reversed(metrics_history):
        chart_data.append({
            "time": m.timestamp.strftime("%M:%S"),
            "fps": round(m.fps, 1),
            "latency": round(m.latency, 1),
            "detected": m.total_detected,
            "passed": m.passed_count,
            "failed": m.failed_count
        })
        
    return {
        "cards": {
            "total_bottles": total_bottles,
            "passed": passed_count,
            "failed": failed_count,
            "avg_fps": round(avg_fps, 1),
            "avg_latency": round(avg_latency, 1)
        },
        "defect_breakdown": {
            "proper_fill": proper_fill,
            "under_fill": under_fill,
            "over_fill": over_fill,
            "label_proper": label_proper,
            "label_torn": label_torn,
            "label_missing": label_missing
        },
        "chart_data": chart_data
    }

@router.get("/history")
def get_inspection_history(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1),
    status: str = Query(None),
    inspection_id: str = Query(None),
    source_type: str = Query(None),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit
    query = db.query(DetectionLog)

    if status:
        query = query.filter(DetectionLog.pass_fail == status)
    if inspection_id:
        query = query.filter(DetectionLog.inspection_id == inspection_id)
    if source_type:
        ids = [
            s.inspection_id
            for s in db.query(InspectionSession.inspection_id)
            .filter(InspectionSession.source_type == source_type)
            .all()
        ]
        if ids:
            query = query.filter(DetectionLog.inspection_id.in_(ids))
        else:
            query = query.filter(DetectionLog.inspection_id == "__none__")

    total = query.count()
    logs = query.order_by(DetectionLog.timestamp.desc()).offset(offset).limit(limit).all()

    session_sources = {}
    if logs:
        session_ids = {log.inspection_id for log in logs if log.inspection_id}
        for s in db.query(InspectionSession).filter(InspectionSession.inspection_id.in_(session_ids)).all():
            session_sources[s.inspection_id] = s.source_type

    items = []
    for log in logs:
        items.append({
            "id": log.id,
            "inspection_id": log.inspection_id,
            "source_type": session_sources.get(log.inspection_id),
            "timestamp": log.timestamp.isoformat(),
            "bottle_id": log.bottle_id,
            "fill_status": log.fill_status,
            "label_status": log.label_status,
            "confidence": log.confidence,
            "pass_fail": log.pass_fail,
            "screenshot_path": log.screenshot_path,
        })
        
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

@router.get("/export/csv")
def export_csv_report(db: Session = Depends(get_db)):
    csv_buffer = ReportService.generate_csv(db)
    return StreamingResponse(
        csv_buffer,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=seewise_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/export/pdf")
def export_pdf_report(db: Session = Depends(get_db)):
    pdf_buffer = ReportService.generate_pdf(db)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=seewise_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
    )

@router.post("/clear-all-history")
def clear_all_history(db: Session = Depends(get_db)):
    """
    Clear all history in the database (fresh start)
    """
    try:
        db.query(DetectionLog).delete()
        db.query(MetricSummary).delete()
        db.query(InspectionSession).delete()
        db.commit()
        return {"message": "All history cleared successfully"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

@router.post("/clear-dashboard-history")
def clear_dashboard_history(db: Session = Depends(get_db)):
    """
    Delete only dashboard history (MetricSummary) for live inspection, not all live inspection history
    """
    try:
        db.query(MetricSummary).delete()
        db.commit()
        return {"message": "Dashboard history cleared successfully"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
