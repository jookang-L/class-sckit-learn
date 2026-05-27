from fastapi import APIRouter, HTTPException

from app.kernel.manager import CapacityError, kernel_manager
from app.schemas import AutoPlotRequest, AutoPlotResponse

router = APIRouter(prefix="/sessions", tags=["visualize"])


@router.post("/{session_id}/auto-plot", response_model=AutoPlotResponse)
def auto_plot(session_id: str, body: AutoPlotRequest) -> AutoPlotResponse:
    try:
        response = kernel_manager.dispatch(
            session_id,
            "autoplot",
            {"algorithm": body.algorithm},
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.") from exc
    except CapacityError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    if response.get("type") == "error":
        raise HTTPException(status_code=400, detail=response.get("error", "시각화 실패"))

    if response.get("type") != "autoplot":
        raise HTTPException(status_code=500, detail="시각화 응답 오류")

    return AutoPlotResponse(
        image_base64=response["image_base64"],
        reference_code=response["reference_code"],
        algorithm=response["algorithm"],
    )
