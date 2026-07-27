#!/usr/bin/env python3
"""
Sentinel-AI Attack Simulator
==============================
A standalone script that fires a complete, realistic, multi-stage
cyber-physical attack scenario against your running Sentinel-AI backend.

Each scenario creates REAL database records viewable in the dashboard.

Usage:
    python attack_simulator.py                   # Interactive menu
    python attack_simulator.py --scenario all    # Run all scenarios
    python attack_simulator.py --scenario 1      # Brute Force campaign
    python attack_simulator.py --scenario 2      # APT intrusion chain
    python attack_simulator.py --scenario 3      # Physical breach
    python attack_simulator.py --scenario 4      # Data exfiltration
    python attack_simulator.py --scenario 5      # Ransomware precursor
    python attack_simulator.py --scenario 6      # Insider threat

Requirements: pip install httpx rich
"""

import argparse
import random
import sys
import time
from datetime import datetime

import httpx

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
    from rich.table import Table
    from rich import print as rprint
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    print("[WARNING] Install 'rich' for a better experience: pip install rich")

console = Console() if HAS_RICH else None

# ── Config ────────────────────────────────────────────────────────────────────

API_BASE = "http://localhost:8000/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

ATTACKER_IPS = [
    "185.220.101.47", "91.108.4.38",  "45.142.212.100",
    "194.165.16.72",  "62.210.115.155", "103.78.228.43",
]
CAMERA_IDS = ["cam-1", "cam-2", "cam-3", "cam-4", "cam-5"]
TARGET_USERS = ["admin", "root", "operator", "sysadmin", "administrator"]


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def get_token() -> str:
    """Authenticate and return a JWT token."""
    resp = httpx.post(f"{API_BASE}/auth/login",
                      data={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=10)
    if resp.status_code != 200:
        print(f"[ERROR] Auth failed: {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]


TOKEN = None

def headers() -> dict:
    global TOKEN
    if TOKEN is None:
        TOKEN = get_token()
    return {"Authorization": f"Bearer {TOKEN}"}


def post_incident(inc_type: str, severity: str, description: str,
                  camera_id: str = "cam-1") -> dict | None:
    resp = httpx.post(f"{API_BASE}/incidents/",
                      json={"type": inc_type, "severity": severity,
                            "description": description, "camera_id": camera_id},
                      headers=headers(), timeout=10)
    if resp.status_code in (200, 201):
        return resp.json()
    return None


def post_login_attempt(username: str) -> bool:
    """Fire a failed login attempt."""
    resp = httpx.post(f"{API_BASE}/auth/login",
                      data={"username": username, "password": "WRONGPASS_ATTACK_SIM"},
                      timeout=5)
    return resp.status_code == 200   # always False for wrong password


def step(msg: str, delay: float = 0.8, status: str = "ok"):
    color = {"ok": "green", "warn": "yellow", "critical": "red", "info": "blue"}.get(status, "white")
    ts = datetime.now().strftime("%H:%M:%S")
    if HAS_RICH:
        console.print(f"  [{color}]{ts}[/{color}] {msg}")
    else:
        print(f"  [{ts}] {msg}")
    time.sleep(delay)


def banner(title: str, subtitle: str = ""):
    if HAS_RICH:
        console.print(Panel.fit(
            f"[bold red]{title}[/bold red]\n[dim]{subtitle}[/dim]",
            border_style="red"
        ))
    else:
        print(f"\n{'='*60}")
        print(f"  {title}")
        if subtitle:
            print(f"  {subtitle}")
        print(f"{'='*60}")


def success(msg: str):
    if HAS_RICH:
        console.print(f"  [bold green]SUCCESS[/bold green] {msg}")
    else:
        print(f"  [+] {msg}")


def warn(msg: str):
    if HAS_RICH:
        console.print(f"  [bold yellow]WARNING[/bold yellow] {msg}")
    else:
        print(f"  [!] {msg}")


def alert(msg: str):
    if HAS_RICH:
        console.print(f"  [bold red]ALERT[/bold red] {msg}")
    else:
        print(f"  [!!!] {msg}")


# ── Scenario 1: Brute Force Campaign ─────────────────────────────────────────

def scenario_brute_force():
    banner("SCENARIO 1: Brute Force / Credential Stuffing",
           "MITRE ATT&CK: T1110 | T1110.003")

    ip = random.choice(ATTACKER_IPS)
    step(f"Attacker IP: {ip} — beginning credential stuffing attack", 0.5, "warn")

    rounds = [
        ("admin",         15),
        ("administrator",  8),
        ("root",          10),
        ("operator",       6),
        ("sysadmin",       9),
    ]

    total = 0
    for username, count in rounds:
        step(f"Spraying '{username}' — {count} attempts...", 0.3, "warn")
        for _ in range(count):
            post_login_attempt(username)
            time.sleep(0.05)
        total += count
        step(f"  {count} failed attempts logged for '{username}'", 0.2, "ok")

    alert(f"Total: {total} failed attempts — brute_force.py will detect within 30s!")
    step("Backing off — attacker waits, then tries again...", 1.0, "info")

    # One more burst after a short pause
    for _ in range(8):
        post_login_attempt("admin")
    step("Second burst: 8 more failed attempts for 'admin'", 0.3, "warn")

    inc = post_incident(
        "brute_force_lockout", "high",
        f"Automated account lockout triggered after {total + 8} failed "
        f"login attempts from {ip}. Attacker sourced from known Tor exit node.",
        random.choice(CAMERA_IDS)
    )
    if inc:
        success(f"Incident created: {inc['id']} — visible in Incidents page now")

    step("Check SOC page — SecurityEvents should appear within 30 seconds!", 0.5, "info")


# ── Scenario 2: APT Intrusion Chain ──────────────────────────────────────────

def scenario_apt():
    banner("SCENARIO 2: APT Intrusion Chain",
           "MITRE ATT&CK: T1190 → T1078 → T1021 → T1055 → T1020")

    ip = random.choice(ATTACKER_IPS)

    step("Phase 1: Reconnaissance — scanning public-facing API endpoints", 0.8, "warn")
    post_incident("api_endpoint_scan", "medium",
                  f"Automated scanner from {ip} probing /api/v1/* endpoints. "
                  "High request rate, sequential path enumeration.", "cam-1")
    step("Recon complete — attacker mapping the attack surface", 0.5, "info")

    step("Phase 2: Initial Access — exploiting exposed endpoint", 1.0, "critical")
    post_incident("exploit_public_facing_application", "critical",
                  f"SQL injection payload detected in request body from {ip}. "
                  "Attempt to bypass authentication on /api/v1/auth/login.", "cam-1")
    step("BREACH: Attacker gained initial foothold", 0.5, "critical")

    step("Phase 3: Lateral Movement — probing internal services", 0.8, "warn")
    post_incident("lateral_movement_detected", "critical",
                  f"Authenticated session from {ip} accessing unusual endpoints: "
                  "/api/v1/users/, /api/v1/cameras/ — pattern matches lateral movement.", "cam-2")

    step("Phase 4: Process Injection — privilege escalation attempt", 0.8, "critical")
    post_incident("privilege_escalation_attempt", "critical",
                  f"Session from {ip} repeatedly calling admin-only endpoints with "
                  "operator-level token. Possible privilege escalation via token manipulation.",
                  "cam-3")

    step("Phase 5: Exfiltration — data being siphoned", 1.0, "critical")
    post_incident("data_exfiltration_in_progress", "critical",
                  f"Sustained high-bandwidth connection from {ip}. "
                  f"Estimated {random.randint(200, 800)} MB exfiltrated to C2 server.",
                  random.choice(CAMERA_IDS))

    alert("FULL APT CHAIN COMPLETE — 5 incidents created. Check Dashboard + Incidents page!")


# ── Scenario 3: Physical Security Breach ─────────────────────────────────────

def scenario_physical_breach():
    banner("SCENARIO 3: Physical Security Breach",
           "Multi-camera perimeter violation sequence")

    cameras_compromised = []
    events = [
        ("cam-1", "perimeter_breach", "critical",
         "Motion detected at perimeter fence — North sector. Object moving at ground level, bypassing sensor grid."),
        ("cam-2", "tailgating_detected", "high",
         "Two individuals detected entering through single-access gate using one badge swipe. Classic tailgating pattern."),
        ("cam-3", "camera_tampering", "critical",
         "Camera feed signal interrupted for 4.2 seconds. Possible physical obstruction or lens spray attack."),
        ("cam-4", "unauthorized_area_entry", "critical",
         "Individual detected in Server Room Zone-A — no badge swipe recorded in the last 10 minutes."),
        ("cam-5", "suspicious_package_detected", "high",
         "Unattended bag/package left near primary power distribution unit. Evacuation protocol recommended."),
    ]

    for cam_id, inc_type, severity, desc in events:
        step(f"Camera {cam_id}: {inc_type.replace('_', ' ').title()}", 0.8, "critical")
        inc = post_incident(inc_type, severity, desc, cam_id)
        if inc:
            cameras_compromised.append(cam_id)
            step(f"  Incident {inc['id']} created — {severity.upper()}", 0.3, "ok")

    alert(f"{len(cameras_compromised)} cameras flagged incidents — {', '.join(cameras_compromised)}")
    step("Physical breach simulation complete — check Live Feed + Incidents!", 0.5, "info")


# ── Scenario 4: Data Exfiltration ────────────────────────────────────────────

def scenario_exfiltration():
    banner("SCENARIO 4: Data Exfiltration Operation",
           "MITRE ATT&CK: T1020 | T1567 | T1048")

    ip = random.choice(ATTACKER_IPS)
    stage_data = [
        (50,  "initial reconnaisance data and credential hashes"),
        (200, "user database dump and access logs"),
        (450, "surveillance footage metadata and camera configs"),
        (800, "full incident database and security event logs"),
    ]

    step(f"Exfiltration channel established to {ip}", 0.5, "warn")
    cumulative = 0

    for mb, desc in stage_data:
        cumulative += mb
        step(f"Exfiltrating: {desc} ({mb} MB)...", 0.7, "critical")
        post_incident(
            "data_exfiltration_detected",
            "critical" if mb > 100 else "high",
            f"Stage exfiltration: {desc}. {mb} MB transferred to external host "
            f"{ip}. Cumulative total: {cumulative} MB.",
            random.choice(CAMERA_IDS)
        )

    step(f"Total data exfiltrated: {cumulative} MB to {ip}", 0.5, "critical")
    post_incident(
        "exfiltration_complete",
        "critical",
        f"CRITICAL: Full exfiltration operation completed. Total: {cumulative} MB "
        f"transferred to {ip}. Immediate incident response required.",
        "cam-1"
    )
    alert(f"Data exfiltration simulation complete — {cumulative} MB in 4 stages!")


# ── Scenario 5: Ransomware Precursor ─────────────────────────────────────────

def scenario_ransomware():
    banner("SCENARIO 5: Ransomware Precursor Activity",
           "MITRE ATT&CK: T1486 | T1490 | T1489")

    ip = random.choice(ATTACKER_IPS)

    chain = [
        ("ransomware_staging_detected", "critical",
         f"Encrypted payload dropper detected in memory from {ip}. "
         "Behavioural signature matches Ryuk/LockBit ransomware family."),
        ("shadow_copy_deletion_attempt", "critical",
         "Attempted execution of 'vssadmin delete shadows' command intercepted. "
         "Classic ransomware pre-encryption phase."),
        ("backup_system_tampering", "critical",
         "Unauthorized access to backup management API. Attacker attempting "
         "to disable automated backups before encryption phase."),
        ("lateral_spread_detected", "critical",
         f"Ransomware payload propagating via SMB to adjacent network segments. "
         f"Source: internal node compromised from {ip}."),
        ("encryption_activity_detected", "critical",
         "Mass file modification detected — 847 files encrypted in 12 seconds. "
         "Ransomware encryption phase initiated. IMMEDIATE RESPONSE REQUIRED."),
    ]

    for inc_type, severity, desc in chain:
        step(f"Stage: {inc_type.replace('_', ' ').title()}", 1.0, "critical")
        post_incident(inc_type, severity, desc, random.choice(CAMERA_IDS))

    alert("Ransomware scenario complete — 5 critical incidents created!")
    step("INCIDENT RESPONSE PROTOCOL SHOULD BE ACTIVATED!", 0.5, "critical")


# ── Scenario 6: Insider Threat ────────────────────────────────────────────────

def scenario_insider_threat():
    banner("SCENARIO 6: Insider Threat Detection",
           "MITRE ATT&CK: T1078 | T1213 | T1020")

    events = [
        ("after_hours_access", "medium",
         "Badge swipe detected at Server Room at 02:34 AM — outside normal working hours "
         "for this user's access profile.", "cam-4"),
        ("mass_data_access", "high",
         "User 'operator' queried entire incidents database 47 times in 3 minutes. "
         "Exfiltration pattern detected.", "cam-1"),
        ("unauthorized_peripheral", "high",
         "USB mass storage device detected connected to workstation in restricted area. "
         "Data transfer activity observed.", "cam-3"),
        ("anomalous_print_job", "medium",
         "Large print job (340 pages) submitted to secure printer at 03:15 AM. "
         "Possible physical document exfiltration.", "cam-2"),
        ("vpn_tunneling_detected", "critical",
         "Unauthorized VPN tunnel established from internal workstation to external "
         "residential IP — possible data staging for exfiltration.", "cam-5"),
    ]

    step("Insider threat timeline reconstruction...", 0.5, "info")
    for inc_type, severity, desc, cam in events:
        step(f"  {inc_type.replace('_', ' ').title()} — {severity.upper()}", 0.7, "warn")
        post_incident(inc_type, severity, desc, cam)

    alert("Insider threat scenario complete — check Incidents for full timeline!")


# ── Menu ──────────────────────────────────────────────────────────────────────

SCENARIOS = {
    "1": ("Brute Force / Credential Stuffing", scenario_brute_force),
    "2": ("APT Intrusion Chain (5-Phase)",     scenario_apt),
    "3": ("Physical Security Breach",          scenario_physical_breach),
    "4": ("Data Exfiltration Operation",       scenario_exfiltration),
    "5": ("Ransomware Precursor Activity",     scenario_ransomware),
    "6": ("Insider Threat Detection",          scenario_insider_threat),
}


def show_menu():
    if HAS_RICH:
        table = Table(title="Sentinel-AI Attack Simulator", border_style="red", show_lines=True)
        table.add_column("#", style="bold red", width=4)
        table.add_column("Scenario", style="white")
        table.add_column("MITRE Coverage", style="dim")
        mitre_map = {
            "1": "T1110, T1110.003",
            "2": "T1190, T1078, T1021, T1055, T1020",
            "3": "Physical / CCTV",
            "4": "T1020, T1567, T1048",
            "5": "T1486, T1490, T1489",
            "6": "T1078, T1213, T1020",
        }
        for k, (name, _) in SCENARIOS.items():
            table.add_row(k, name, mitre_map.get(k, ""))
        table.add_row("all", "[bold]Run ALL scenarios[/bold]", "Full coverage")
        table.add_row("q", "[dim]Quit[/dim]", "")
        console.print(table)
    else:
        print("\nSentinel-AI Attack Simulator")
        print("-" * 40)
        for k, (name, _) in SCENARIOS.items():
            print(f"  {k}: {name}")
        print("  all: Run all scenarios")
        print("  q: Quit")

    return input("\nChoose scenario: ").strip().lower()


def main():
    parser = argparse.ArgumentParser(description="Sentinel-AI Attack Simulator")
    parser.add_argument("--scenario", default=None,
                        help="Scenario to run: 1-6, 'all', or omit for interactive menu")
    args = parser.parse_args()

    if HAS_RICH:
        console.print(Panel(
            "[bold red]SENTINEL-AI ATTACK SIMULATOR[/bold red]\n"
            "[dim]Generates REAL attack data in your database.[/dim]\n"
            "[yellow]For development/demo purposes only.[/yellow]",
            border_style="red"
        ))
    else:
        print("\n" + "="*60)
        print("  SENTINEL-AI ATTACK SIMULATOR")
        print("  Generates REAL attack data in your database.")
        print("="*60)

    # Verify backend is reachable
    try:
        resp = httpx.get(f"{API_BASE.replace('/api/v1', '')}/health", timeout=5)
        step("Backend reachable", 0.2, "ok")
    except Exception:
        print("[ERROR] Cannot reach backend at", API_BASE)
        print("Make sure the backend is running: .\\start.bat")
        sys.exit(1)

    # Auth
    try:
        global TOKEN
        TOKEN = get_token()
        step("Authentication successful", 0.2, "ok")
    except Exception as e:
        print(f"[ERROR] Auth failed: {e}")
        sys.exit(1)

    choice = args.scenario or show_menu()

    if choice == "q":
        return

    if choice == "all":
        for k, (name, fn) in SCENARIOS.items():
            print(f"\n{'─'*60}")
            fn()
            time.sleep(2)
        if HAS_RICH:
            console.print(Panel("[bold green]ALL SCENARIOS COMPLETE![/bold green]\nCheck your Sentinel-AI dashboard.", border_style="green"))
        else:
            print("\n[ALL SCENARIOS COMPLETE] Check your Sentinel-AI dashboard.")
    elif choice in SCENARIOS:
        SCENARIOS[choice][1]()
    else:
        print(f"[ERROR] Unknown scenario: {choice}")
        sys.exit(1)


if __name__ == "__main__":
    main()
