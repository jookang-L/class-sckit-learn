from fastapi import APIRouter, HTTPException

from app.analysis.validators import validate_steps
from app.kernel.manager import CapacityError, kernel_manager
from app.schemas import KernelState, StepValidationResult

router = APIRouter(prefix="/sessions", tags=["inspect"])


@router.get("/{session_id}/state", response_model=KernelState)
def get_state(session_id: str) -> KernelState:
    try:
        if not kernel_manager.has_worker(session_id):
            return KernelState()
        response = kernel_manager.dispatch(session_id, "inspect")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.") from exc
    except CapacityError:
        return KernelState()

    if response.get("type") != "state":
        raise HTTPException(status_code=500, detail="상태 조회 실패")
    return KernelState(**{k: v for k, v in response.items() if k != "type"})


@router.get("/{session_id}/validate", response_model=list[StepValidationResult])
def validate_guided_steps(session_id: str, algorithm: str | None = None) -> list[StepValidationResult]:
    state = get_state(session_id)
    return validate_steps(state, algorithm)
