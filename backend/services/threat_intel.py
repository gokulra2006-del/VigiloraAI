import httpx
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.assets import ThreatIntel
from config.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"

async def fetch_cisa_kev_and_seed():
    """Fetches CISA KEV JSON feed and inserts top 50 threats into the DB."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(CISA_KEV_URL, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            vulnerabilities = data.get("vulnerabilities", [])
            # Sort by date added (newest first) and take the top 50
            vulnerabilities.sort(key=lambda x: x.get("dateAdded", ""), reverse=True)
            top_vulns = vulnerabilities[:50]

            async with AsyncSessionLocal() as session:
                for vuln in top_vulns:
                    # Check if already exists
                    result = await session.execute(select(ThreatIntel).where(ThreatIntel.id == vuln["cveID"]))
                    existing = result.scalar_one_or_none()
                    
                    if not existing:
                        new_threat = ThreatIntel(
                            id=vuln["cveID"],
                            title=vuln["vulnerabilityName"],
                            cvss=None, # CISA KEV doesn't provide CVSS in this exact feed, would need NVD for that
                            status="active",
                            details=vuln["shortDescription"]
                        )
                        session.add(new_threat)
                
                await session.commit()
                logger.info("Successfully fetched and synced CISA KEV data.")
    except Exception as e:
        logger.error(f"Failed to fetch CISA KEV data: {e}")
