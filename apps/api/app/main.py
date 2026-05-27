from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.kernel.manager import kernel_manager
from app.routers import datasets, execute, inspect, sessions, visualize
from app.schemas import HealthResponse

app = FastAPI(
    title="Sckit-Learn Lab API",
    description="고등학생 대상 sklearn 실습 플랫폼 백엔드",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin, "http://localhost:3000"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(execute.router)
app.include_router(inspect.router)
app.include_router(datasets.router)
app.include_router(visualize.router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Sckit-Learn Lab API",
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        active_sessions=kernel_manager.active_count(),
        active_workers=kernel_manager.active_worker_count(),
    )
