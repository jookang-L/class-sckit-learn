from fastapi import APIRouter, HTTPException

from app.kernel.manager import kernel_manager
from app.schemas import SessionCreateResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionCreateResponse)
def create_session() -> SessionCreateResponse:
    session_id = kernel_manager.create()
    return SessionCreateResponse(session_id=session_id)


@router.delete("/{session_id}")
def delete_session(session_id: str) -> dict:
    try:
        kernel_manager.destroy(session_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@router.post("/{session_id}/reset")
def reset_session(session_id: str) -> dict:
    try:
        kernel_manager.dispatch(session_id, "reset")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}
