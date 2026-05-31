import io
import pandas as pd
from sqlalchemy.orm import Session
from backend.database.models import DetectionLog
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportService:
    @staticmethod
    def generate_csv(db: Session) -> io.BytesIO:
        logs = db.query(DetectionLog).order_by(DetectionLog.timestamp.desc()).all()
        
        data = []
        for log in logs:
            data.append({
                "Log ID": log.id,
                "Timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "Bottle ID": log.bottle_id,
                "Fill Status": log.fill_status.replace("_", " ").title(),
                "Label Status": log.label_status.replace("_", " ").title(),
                "Confidence": f"{log.confidence * 100:.2f}%",
                "Inspection Result": log.pass_fail,
                "Screenshot Saved": "Yes" if log.screenshot_path else "No"
            })
            
        df = pd.DataFrame(data)
        
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)
        return csv_buffer

    @staticmethod
    def generate_pdf(db: Session) -> io.BytesIO:
        logs = db.query(DetectionLog).order_by(DetectionLog.timestamp.desc()).limit(100).all()
        
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter,
                                rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        
        styles = getSampleStyleSheet()
        
        # Premium Minimal Industrial Style
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=24,
            textColor=colors.HexColor("#0A0A0A"),
            spaceAfter=12
        )
        
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#666666"),
            spaceAfter=24
        )
        
        body_style = ParagraphStyle(
            name="BodyStyle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#333333")
        )
        
        header_cell_style = ParagraphStyle(
            name="HeaderCellStyle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#FFFFFF"),
            fontName="Helvetica-Bold"
        )
        
        elements = []
        
        # Header / Branding
        elements.append(Paragraph("SeeWise", title_style))
        elements.append(Paragraph("Industrial Water Bottle Inspection Report | Top 100 Recent Scans", subtitle_style))
        elements.append(Spacer(1, 12))
        
        # Table data scaffold
        table_data = [[
            Paragraph("ID", header_cell_style),
            Paragraph("Timestamp", header_cell_style),
            Paragraph("Bottle ID", header_cell_style),
            Paragraph("Fill Status", header_cell_style),
            Paragraph("Label Status", header_cell_style),
            Paragraph("Conf", header_cell_style),
            Paragraph("Result", header_cell_style)
        ]]
        
        for log in logs:
            result_color = "#22C55E" # green
            if log.pass_fail == "FAIL":
                result_color = "#EF4444" # red
            elif log.pass_fail == "WARNING":
                result_color = "#F59E0B" # amber
                
            res_style = ParagraphStyle(
                name=f"res_{log.id}",
                parent=body_style,
                textColor=colors.HexColor(result_color),
                fontName="Helvetica-Bold"
            )
            
            table_data.append([
                Paragraph(str(log.id), body_style),
                Paragraph(log.timestamp.strftime("%Y-%m-%d %H:%M:%S"), body_style),
                Paragraph(f"#{log.bottle_id}" if log.bottle_id else "-", body_style),
                Paragraph(log.fill_status.replace("_", " ").title(), body_style),
                Paragraph(log.label_status.replace("_", " ").title(), body_style),
                Paragraph(f"{log.confidence * 100:.1f}%", body_style),
                Paragraph(log.pass_fail, res_style)
            ])
            
        # Draw neat minimal grid
        t = Table(table_data, colWidths=[30, 110, 60, 110, 110, 50, 60])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0A0A0A')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('BOTTOMPADDING', (0,1), (-1,-1), 6),
            ('TOPPADDING', (0,1), (-1,-1), 6),
        ]))
        
        elements.append(t)
        
        # Build Document
        doc.build(elements)
        pdf_buffer.seek(0)
        return pdf_buffer
