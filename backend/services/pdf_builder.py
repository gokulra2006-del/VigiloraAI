"""
VIGILORA AI — Pure Python PDF Dossier Generator
===============================================
Generates high-definition, standard-compliant PDF-1.4 security incident dossiers
without requiring external binary tools (WeasyPrint / wkhtmltopdf / Chromium).
"""

import os
from datetime import datetime, timezone

def _escape_pdf_str(text: str) -> str:
    """Escape special characters for PDF literal strings."""
    if not text:
        return ""
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").encode("latin-1", "replace").decode("latin-1")

class SimplePDFBuilder:
    def __init__(self, title="VIGILORA AI Incident Report"):
        self.title = title
        self.objects = []
        self.stream_commands = []
        self.page_width = 595.28  # A4 width in points (72 dpi)
        self.page_height = 841.89 # A4 height in points
        self.current_y = 790.0

    def add_header(self, case_id: str, severity: str, timestamp: str):
        """Renders dark header bar with brand title."""
        # Top banner background
        self.stream_commands.append("0.05 0.05 0.08 rg") # dark navy
        self.stream_commands.append(f"0 {self.page_height - 70} {self.page_width} 70 re f")
        
        # Cyan accent line
        self.stream_commands.append("0.0 0.8 0.9 rg")
        self.stream_commands.append(f"0 {self.page_height - 72} {self.page_width} 2 re f")

        # Brand Title
        self.stream_commands.append("BT")
        self.stream_commands.append("/F1 16 Tf")
        self.stream_commands.append("1.0 1.0 1.0 rg")
        self.stream_commands.append(f"30 {self.page_height - 38} Td")
        self.stream_commands.append(f"({_escape_pdf_str('VIGILORA AI // SECURITY OPERATIONS')}) Tj")
        self.stream_commands.append("ET")

        # Subtitle
        self.stream_commands.append("BT")
        self.stream_commands.append("/F1 9 Tf")
        self.stream_commands.append("0.7 0.7 0.8 rg")
        self.stream_commands.append(f"30 {self.page_height - 52} Td")
        self.stream_commands.append(f"({_escape_pdf_str('Automated Incident Investigation Dossier | Official Forensic Record')}) Tj")
        self.stream_commands.append("ET")

        # Case ID & Severity on Right
        self.stream_commands.append("BT")
        self.stream_commands.append("/F1 11 Tf")
        sev_color = "1.0 0.2 0.2" if severity == "critical" else "1.0 0.5 0.0" if severity == "high" else "0.2 0.8 0.3"
        self.stream_commands.append(f"{sev_color} rg")
        self.stream_commands.append(f"{self.page_width - 180} {self.page_height - 40} Td")
        self.stream_commands.append(f"({_escape_pdf_str(f'CASE #{case_id[:8].upper()} [{severity.upper()}]')}) Tj")
        self.stream_commands.append("ET")

        self.current_y = self.page_height - 100

    def add_section_title(self, title: str):
        """Draws a bold section header with divider."""
        self.current_y -= 15
        self.stream_commands.append("BT")
        self.stream_commands.append("/F1 12 Tf")
        self.stream_commands.append("0.1 0.1 0.15 rg")
        self.stream_commands.append(f"30 {self.current_y} Td")
        self.stream_commands.append(f"({_escape_pdf_str(title.upper())}) Tj")
        self.stream_commands.append("ET")

        # Divider line
        self.stream_commands.append("0.8 0.85 0.9 RG")
        self.stream_commands.append("0.75 w")
        self.stream_commands.append(f"30 {self.current_y - 4} m {self.page_width - 30} {self.current_y - 4} l S")
        self.current_y -= 20

    def add_key_value_box(self, items: list[tuple[str, str]]):
        """Draws an executive summary card with key metrics."""
        box_height = 55.0
        self.current_y -= box_height
        # Box background
        self.stream_commands.append("0.96 0.97 0.98 rg")
        self.stream_commands.append(f"30 {self.current_y} {self.page_width - 60} {box_height} re f")
        self.stream_commands.append("0.85 0.88 0.92 RG")
        self.stream_commands.append("0.5 w")
        self.stream_commands.append(f"30 {self.current_y} {self.page_width - 60} {box_height} re S")

        col_width = (self.page_width - 80) / len(items)
        for i, (label, val) in enumerate(items):
            x = 40 + i * col_width
            # Label
            self.stream_commands.append("BT")
            self.stream_commands.append("/F1 8 Tf")
            self.stream_commands.append("0.4 0.45 0.55 rg")
            self.stream_commands.append(f"{x} {self.current_y + 35} Td")
            self.stream_commands.append(f"({_escape_pdf_str(label.upper())}) Tj")
            self.stream_commands.append("ET")
            # Value
            self.stream_commands.append("BT")
            self.stream_commands.append("/F1 10 Tf")
            self.stream_commands.append("0.1 0.1 0.2 rg")
            self.stream_commands.append(f"{x} {self.current_y + 18} Td")
            self.stream_commands.append(f"({_escape_pdf_str(val)}) Tj")
            self.stream_commands.append("ET")

        self.current_y -= 15

    def add_paragraph(self, text: str):
        """Renders wrapped paragraph text."""
        self.stream_commands.append("BT")
        self.stream_commands.append("/F1 9.5 Tf")
        self.stream_commands.append("0.2 0.2 0.25 rg")
        
        # Simple wrapping
        words = text.split(" ")
        lines = []
        cur_line = []
        for w in words:
            if len(" ".join(cur_line + [w])) > 90:
                lines.append(" ".join(cur_line))
                cur_line = [w]
            else:
                cur_line.append(w)
        if cur_line:
            lines.append(" ".join(cur_line))

        for line in lines:
            self.stream_commands.append(f"30 {self.current_y} Td")
            self.stream_commands.append(f"({_escape_pdf_str(line)}) Tj")
            self.current_y -= 13
            self.stream_commands.append(f"-30 0 Td")

        self.stream_commands.append("ET")
        self.current_y -= 10

    def add_table(self, headers: list[str], rows: list[list[str]]):
        """Draws a clean tabular report grid."""
        row_height = 20.0
        col_widths = [75, 110, 65, 130, 155]  # sum = 535
        table_width = sum(col_widths)

        # Header row
        self.current_y -= row_height
        self.stream_commands.append("0.12 0.15 0.22 rg")
        self.stream_commands.append(f"30 {self.current_y} {table_width} {row_height} re f")

        x = 35
        for i, h in enumerate(headers):
            self.stream_commands.append("BT")
            self.stream_commands.append("/F1 8.5 Tf")
            self.stream_commands.append("1.0 1.0 1.0 rg")
            self.stream_commands.append(f"{x} {self.current_y + 6} Td")
            self.stream_commands.append(f"({_escape_pdf_str(h.upper())}) Tj")
            self.stream_commands.append("ET")
            x += col_widths[i]

        # Table rows
        for r_idx, row in enumerate(rows):
            self.current_y -= row_height
            # Alternating background
            if r_idx % 2 == 1:
                self.stream_commands.append("0.96 0.97 0.99 rg")
                self.stream_commands.append(f"30 {self.current_y} {table_width} {row_height} re f")

            # Border bottom
            self.stream_commands.append("0.88 0.9 0.94 RG")
            self.stream_commands.append("0.5 w")
            self.stream_commands.append(f"30 {self.current_y} m {30 + table_width} {self.current_y} l S")

            x = 35
            for i, cell in enumerate(row):
                self.stream_commands.append("BT")
                self.stream_commands.append("/F1 8.5 Tf")
                self.stream_commands.append("0.2 0.2 0.25 rg")
                self.stream_commands.append(f"{x} {self.current_y + 6} Td")
                cell_str = str(cell)
                if len(cell_str) > 28:
                    cell_str = cell_str[:25] + "..."
                self.stream_commands.append(f"({_escape_pdf_str(cell_str)}) Tj")
                self.stream_commands.append("ET")
                x += col_widths[i]

        self.current_y -= 15

    def add_footer(self):
        """Draws official bottom security stamp."""
        self.stream_commands.append("0.8 0.85 0.9 RG")
        self.stream_commands.append("0.5 w")
        self.stream_commands.append(f"30 40 m {self.page_width - 30} 40 l S")

        self.stream_commands.append("BT")
        self.stream_commands.append("/F1 8 Tf")
        self.stream_commands.append("0.5 0.55 0.6 rg")
        self.stream_commands.append(f"30 25 Td")
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        self.stream_commands.append(f"({_escape_pdf_str(f'Generated by VIGILORA AI Core Intelligence | Security Timestamp: {now_str}')}) Tj")
        self.stream_commands.append(f"{self.page_width - 150} 0 Td")
        self.stream_commands.append(f"({_escape_pdf_str('CONFIDENTIAL — SOC USE ONLY')}) Tj")
        self.stream_commands.append("ET")

    def build(self) -> bytes:
        """Assembles PDF objects and produces standard-compliant binary bytes."""
        stream_content = "\n".join(self.stream_commands).encode("latin-1")
        stream_len = len(stream_content)

        # Object 1: Catalog
        # Object 2: Pages
        # Object 3: Page 1
        # Object 4: Font F1 (Helvetica)
        # Object 5: Content Stream
        
        pdf = bytearray()
        pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        
        offsets = []

        def add_obj(body: bytes):
            offsets.append(len(pdf))
            obj_num = len(offsets)
            pdf.extend(f"{obj_num} 0 obj\n".encode("ascii"))
            pdf.extend(body)
            pdf.extend(b"\nendobj\n")
            return obj_num

        add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")
        add_obj(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
        add_obj(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {self.page_width} {self.page_height}] "
            f"/Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>".encode("ascii")
        )
        add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        add_obj(f"<< /Length {stream_len} >>\nstream\n".encode("ascii") + stream_content + b"\nendstream")

        xref_offset = len(pdf)
        pdf.extend(b"xref\n")
        pdf.extend(f"0 {len(offsets) + 1}\n".encode("ascii"))
        pdf.extend(b"0000000000 65535 f \n")
        for off in offsets:
            pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))

        pdf.extend(b"trailer\n")
        pdf.extend(f"<< /Size {len(offsets) + 1} /Root 1 0 R >>\n".encode("ascii"))
        pdf.extend(b"startxref\n")
        pdf.extend(f"{xref_offset}\n%%EOF\n".encode("ascii"))

        return bytes(pdf)