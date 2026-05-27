from fastapi import APIRouter, HTTPException

from app.analysis.error_translator import translate_error
from app.kernel.manager import CapacityError, kernel_manager
from app.schemas import ExecuteRequest, ExecuteResult

router = APIRouter(prefix="/sessions", tags=["execute"])


@router.post("/{session_id}/execute", response_model=ExecuteResult)
def execute_code(session_id: str, body: ExecuteRequest) -> ExecuteResult:
    try:
        response = kernel_manager.dispatch(session_id, "exec", {"src": body.code})
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.") from exc
    except CapacityError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except TimeoutError as exc:
        return ExecuteResult(
            ok=False,
            error=str(exc),
            error_type="TimeoutError",
            friendly_error=translate_error("TimeoutError", str(exc)),
        )

    if response.get("type") != "result":
        raise HTTPException(status_code=500, detail="워커 응답 형식 오류")

    friendly = translate_error(response.get("error_type"), response.get("error"))
    return ExecuteResult(
        ok=bool(response.get("ok")),
        stdout=response.get("stdout", ""),
        stderr=response.get("stderr", ""),
        error=response.get("error"),
        error_type=response.get("error_type"),
        images=response.get("images", []),
        dataframes_preview=response.get("dataframes_preview", []),
        friendly_error=friendly,
    )
