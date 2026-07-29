"""Risk Scores API — Genesis Layer 2. Exposes zone risk heatmap data."""
from fastapi import APIRouter, Depends
from config.database import get_db
from security.auth import get_current_user
from services.risk_scorer import get_heatmap, _compute_scores

router = APIRouter()


@router.get("/heatmap")
async def get_risk_heatmap(current_user=Depends(get_current_user)):
    """Return current risk scores for all zones."""
    return get_heatmap()


@router.post("/recompute")
async def recompute_risk_scores(
    current_user=Depends(get_current_user),
):
    """Manually trigger risk score recomputation."""
    try:
        await _compute_scores()
        return {"status": "recomputed", "zone_count": len(get_heatmap())}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
