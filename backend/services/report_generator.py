"""
Report Generator Service — Genesis Layer 3.
Generates AI-style incident reports for Cases.
Uses Python's built-in string formatting (no external PDF libs required).
Saves an HTML report that can be rendered/printed as PDF from the browser.
"""
import os
from datetime import datetime, timezone
from config.database import AsyncSessionLocal
from models.assets import Case, Incident, IncidentReport, PlaybookExecution
from sqlalchemy.future import select


REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "reports")


def _ensure_reports_dir():
    os.makedirs(REPORTS_DIR, exist_ok=True)


def _severity_badge(severity: str) -> str:
    colors = {
        "critical": "#ef4444",
        "high": "#f97316",
        "medium": "#eab308",
        "low": "#3b82f6",
    }
    color = colors.get(severity, "#6b7280")
    return f'<span style="background:{color}20;color:{color};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase">{severity}</span>'


def _html_report(case: Case, incidents: list, executions: list) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    inc_rows = ""
    for inc in incidents:
        ts = getattr(inc, "detected_at", None)
        ts_str = ts.strftime("%Y-%m-%d %H:%M") if ts else "—"
        inc_rows += f"""
        <tr>
          <td style="padding:8px 12px;font-family:monospace;font-size:12px;color:#94a3b8">{str(getattr(inc,'id',''))[:8].upper()}</td>
          <td style="padding:8px 12px;font-size:13px">{getattr(inc,'type','')}</td>
          <td style="padding:8px 12px">{_severity_badge(getattr(inc,'severity','medium'))}</td>
          <td style="padding:8px 12px;font-size:12px;color:#94a3b8">{getattr(inc,'camera_id','—') or '—'}</td>
          <td style="padding:8px 12px;font-size:12px;color:#94a3b8">{ts_str}</td>
        </tr>
        """

    pb_rows = ""
    for ex in executions[:5]:
        ts = getattr(ex, "executed_at", None)
        ts_str = ts.strftime("%H:%M:%S") if ts else "—"
        pb_name = getattr(ex.playbook, "name", "Unknown") if ex.playbook else "Unknown"
        pb_rows += f"""
        <tr>
          <td style="padding:8px 12px;font-size:13px">{pb_name}</td>
          <td style="padding:8px 12px;font-size:12px;color:#94a3b8">{getattr(ex,'trigger_event','')}</td>
          <td style="padding:8px 12px;font-size:12px;color:#94a3b8">{ts_str}</td>
        </tr>
        """

    summary = getattr(case, "summary", "") or f"Case automatically created from {len(incidents)} detected incident(s)."

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Incident Report — {case.id[:8].upper()}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0f172a; color:#e2e8f0; padding:40px; }}
  h1 {{ font-size:24px; font-weight:700; color:#f8fafc; }}
  h2 {{ font-size:15px; font-weight:600; color:#cbd5e1; margin:24px 0 12px; text-transform:uppercase; letter-spacing:0.05em; }}
  .header {{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; border-bottom:1px solid #1e293b; padding-bottom:24px; }}
  .meta {{ font-size:12px; color:#64748b; line-height:1.8; text-align:right; }}
  .summary {{ background:#1e293b; border:1px solid #334155; border-radius:8px; padding:16px; font-size:13px; line-height:1.7; color:#94a3b8; margin-bottom:8px; }}
  table {{ width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden; }}
  thead {{ background:#0f172a; }}
  thead th {{ padding:10px 12px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; }}
  tbody tr {{ border-top:1px solid #0f172a; }}
  tbody tr:hover {{ background:#253147; }}
  .footer {{ margin-top:40px; font-size:11px; color:#475569; border-top:1px solid #1e293b; padding-top:16px; }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">SentinelVision Core — Automated Incident Report</div>
      <h1>Case #{case.id[:8].upper()}</h1>
      <div style="margin-top:8px">{_severity_badge(getattr(case,'severity','medium'))}</div>
    </div>
    <div class="meta">
      <div>Generated: {now}</div>
      <div>Case Status: <strong style="color:#e2e8f0">{getattr(case,'status','').replace('_',' ').title()}</strong></div>
      <div>Incidents: <strong style="color:#e2e8f0">{len(incidents)}</strong></div>
    </div>
  </div>

  <h2>Executive Summary</h2>
  <div class="summary">{summary}</div>

  <h2>Incident Timeline ({len(incidents)} events)</h2>
  <table>
    <thead><tr>
      <th>ID</th><th>Type</th><th>Severity</th><th>Source Camera</th><th>Detected At</th>
    </tr></thead>
    <tbody>{inc_rows or '<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748b">No incidents linked to this case.</td></tr>'}</tbody>
  </table>

  {'<h2>Automated Responses (' + str(len(executions)) + ' playbook executions)</h2><table><thead><tr><th>Playbook</th><th>Trigger</th><th>Executed At</th></tr></thead><tbody>' + pb_rows + '</tbody></table>' if executions else ''}

  <div class="footer">
    This report was automatically generated by SentinelVision Core AI. Case ID: {case.id} | Title: {getattr(case,'title','')}
  </div>
</body>
</html>"""


async def generate_report_for_case(case_id: str) -> dict:
    """Generate an HTML incident report for a case. Returns metadata dict."""
    _ensure_reports_dir()

    async with AsyncSessionLocal() as db:
        case_result = await db.execute(select(Case).where(Case.id == case_id))
        case = case_result.scalar_one_or_none()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        inc_result = await db.execute(
            select(Incident).where(Incident.case_id == case_id).order_by(Incident.detected_at.asc())
        )
        incidents = inc_result.scalars().all()

        exec_result = await db.execute(
            select(PlaybookExecution)
            .where(PlaybookExecution.trigger_ref_id == case_id)
            .order_by(PlaybookExecution.executed_at.asc())
        )
        executions = exec_result.scalars().all()

        html = _html_report(case, incidents, executions)
        filename = f"report_{case_id[:8]}.html"
        filepath = os.path.join(REPORTS_DIR, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)

        summary = case.summary or f"Auto-generated report for case {case_id[:8].upper()} covering {len(incidents)} incident(s)."

        # Upsert IncidentReport record
        existing = await db.execute(
            select(IncidentReport).where(IncidentReport.case_id == case_id)
        )
        report = existing.scalar_one_or_none()
        if report:
            report.pdf_path = filepath
            report.summary_text = summary
            report.generated_at = datetime.now(timezone.utc)
        else:
            report = IncidentReport(
                case_id=case_id,
                pdf_path=filepath,
                summary_text=summary,
            )
            db.add(report)

        await db.commit()

        return {
            "report_id": report.id if hasattr(report, "id") else case_id,
            "case_id": case_id,
            "pdf_path": filepath,
            "summary_text": summary,
            "incident_count": len(incidents),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
