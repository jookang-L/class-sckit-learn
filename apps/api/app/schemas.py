from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SessionCreateResponse(BaseModel):
    session_id: str


class ExecuteRequest(BaseModel):
    code: str
    cell_id: str | None = None


class DataFramePreview(BaseModel):
    name: str
    shape: list[int]
    columns: list[str]
    head: list[dict[str, Any]]
    dtypes: dict[str, str]


class ArrayInfo(BaseModel):
    name: str
    shape: list[int]
    ndim: int
    dtype: str


class EstimatorInfo(BaseModel):
    name: str
    class_name: str
    fitted: bool
    params: dict[str, Any] = Field(default_factory=dict)


class KernelState(BaseModel):
    dataframes: list[DataFramePreview] = Field(default_factory=list)
    arrays: list[ArrayInfo] = Field(default_factory=list)
    estimators: list[EstimatorInfo] = Field(default_factory=list)
    last_score: float | None = None
    last_predict_shape: list[int] | None = None
    did_predict: bool = False
    did_score: bool = False
    variable_names: list[str] = Field(default_factory=list)


class ExecuteResult(BaseModel):
    ok: bool
    stdout: str = ""
    stderr: str = ""
    error: str | None = None
    error_type: str | None = None
    images: list[str] = Field(default_factory=list)
    dataframes_preview: list[DataFramePreview] = Field(default_factory=list)
    friendly_error: str | None = None


class DatasetInfo(BaseModel):
    id: str
    name: str
    filename: str
    rows: int
    columns: int
    description: str = ""


class ColumnProfile(BaseModel):
    name: str
    dtype: str
    kind: Literal["numeric", "categorical", "other"]
    missing_count: int
    missing_pct: float
    sample_values: list[str] = Field(default_factory=list)


class DatasetProfile(BaseModel):
    name: str
    shape: list[int]
    columns: list[ColumnProfile]
    has_missing: bool
    target_candidates: list[str] = Field(default_factory=list)
    task_hint: Literal["classification", "regression", "unknown"] = "unknown"
    preview: list[dict[str, Any]] = Field(default_factory=list)


class AutoPlotRequest(BaseModel):
    algorithm: str | None = None


class AutoPlotResponse(BaseModel):
    image_base64: str
    reference_code: str
    algorithm: str
    note: str = "참고용 시각화 코드입니다. 직접 작성해도 됩니다."


class NotebookInfo(BaseModel):
    id: str
    title: str
    filename: str
    algorithm: str


class StepValidationResult(BaseModel):
    step_id: str
    passed: bool
    reason: str | None = None


class HealthResponse(BaseModel):
    status: str
    active_sessions: int
    active_workers: int = 0
