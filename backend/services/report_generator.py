"""
Report Generator Service — Genesis Layer 3.
Generates AI-style incident reports for Cases in both HTML and native PDF formats.
"""
import os
from datetime import datetime, timezone
from config.database import AsyncSessionLocal
from models.assets import Case, Incident, IncidentReport, PlaybookExecution
from sqlalchemy.future import select
from services.pdf_builder import SimplePDFBuilder


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

    summary = getattr(case, "summary", "") or (
        f"Case #{case.id[:8].upper()} was automatically consolidated from {len(incidents)} linked physical and cyber incident(s). "
        f"Initial detection occurred in zone '{getattr(case,'zone_id','default')}'. "
        f"All related video streams and sensor logs have been correlated and cataloged."
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>VIGILORA AI — Incident Report #{case.id[:8].upper()}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; padding:32px; }}
  .header {{ display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #1e293b; padding-bottom:24px; margin-bottom:28px; }}
  h1 {{ margin:0 0 4px; font-size:22px; color:#f8fafc; font-weight:700; }}
  .meta {{ font-size:12px; color:#64748b; text-align:right; line-height:1.8; }}
  .badge {{ display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; text-transform:uppercase; }}
  .summary {{ background:#1e293b; border-left:3px solid #38bdf8; border-radius:0 8px 8px 0; padding:16px 20px; margin-bottom:28px; font-size:14px; line-height:1.6; color:#cbd5e1; }}
  h2 {{ font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; margin:28px 0 12px; }}
  table {{ width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden; font-size:13px; margin-bottom:24px; }}
  th {{ background:#1e293b; padding:10px 12px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:#64748b; border-bottom:1px solid #334155; }}
  td {{ border-bottom:1px solid #253147; vertical-align:middle; }}
  tbody tr:last-child td {{ border-bottom:none; }}
  tbody tr:hover {{ background:#253147; }}
  .footer {{ margin-top:40px; font-size:11px; color:#475569; border-top:1px solid #1e293b; padding-top:16px; }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">VIGILORA AI — Automated Incident Report</div>
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
    This report was automatically generated by VIGILORA AI. Case ID: {case.id} | Title: {getattr(case,'title','')}
  </div>
</body>
</html>"""


def _generate_binary_pdf(case: Case, incidents: list, executions: list, filepath: str):
    """Generates standard-compliant PDF dossier and writes to disk."""
    builder = SimplePDFBuilder(title=f"VIGILORA AI Dossier #{case.id[:8].upper()}")
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sev = getattr(case, "severity", "medium") or "medium"
    
    # 1. Header
    builder.add_header(case.id, sev, now_str)

    # 2. Executive Box
    summary_text = getattr(case, "summary", "") or f"Consolidated incident dossier for case #{case.id[:8].upper()} with {len(incidents)} correlated security event(s)."
    builder.add_key_value_box([
        ("Case ID", f"#{case.id[:8].upper()}"),
        ("Severity", sev.upper()),
        ("Status", getattr(case, "status", "open").upper()),
        ("Zone / Sector", getattr(case, "zone_id", "Primary Sector") or "Sector 1"),
        ("Events", str(len(incidents))),
    ])

    # 3. Summary Paragraph
    builder.add_section_title("1. Executive Summary")
    builder.add_paragraph(summary_text)

    # 4. Incident Timeline Table
    builder.add_section_title(f"2. Chronological Incident Timeline ({len(incidents)} Events)")
    headers = ["ID", "Incident Type", "Severity", "Camera Node", "Detected At"]
    rows = []
    for inc in incidents[:12]:
        ts = getattr(inc, "detected_at", None)
        ts_str = ts.strftime("%H:%M:%S UTC") if ts else "—"
        rows.append([
            str(getattr(inc, "id", ""))[:8].upper(),
            str(getattr(inc, "type", "incident")),
            str(getattr(inc, "severity", "medium")).upper(),
            str(getattr(inc, "camera_id", "cam-1") or "cam-1"),
            ts_str,
        ])
    if not rows:
        rows = [["—", "No incidents recorded", "—", "—", "—"]]
    builder.add_table(headers, rows)

    # 5. Footer Stamp
    builder.add_footer()

    pdf_bytes = builder.build()
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)


async def generate_report_for_case(case_id: str) -> dict:
    """Generate both HTML and native PDF incident reports for a case."""
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

        # 1. HTML Report
        html = _html_report(case, incidents, executions)
        html_filename = f"report_{case_id[:8]}.html"
        html_filepath = os.path.join(REPORTS_DIR, html_filename)
        with open(html_filepath, "w", encoding="utf-8") as f:
            f.write(html)

        # 2. Native PDF Report
        pdf_filename = f"report_{case_id[:8]}.pdf"
        pdf_filepath = os.path.join(REPORTS_DIR, pdf_filename)
        _generate_binary_pdf(case, incidents, executions, pdf_filepath)

        summary = case.summary or f"Auto-generated report for case {case_id[:8].upper()} covering {len(incidents)} incident(s)."

        # Upsert IncidentReport record
        existing = await db.execute(
            select(IncidentReport).where(IncidentReport.case_id == case_id)
        )
        report = existing.scalar_one_or_none()
        if report:
            report.pdf_path = pdf_filepath
            report.summary_text = summary
            report.generated_at = datetime.now(timezone.utc)
        else:
            report = IncidentReport(
                case_id=case_id,
                pdf_path=pdf_filepath,
                summary_text=summary,
            )
            db.add(report)

        await db.commit()

        return {
            "report_id": report.id if hasattr(report, "id") else case_id,
            "case_id": case_id,
            "html_path": html_filepath,
            "pdf_path": pdf_filepath,
            "summary_text": summary,
            "incident_count": len(incidents),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }