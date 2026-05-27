from __future__ import annotations

import uuid
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.analysis.csv_profile import profile_dataframe
from app.config import settings
from app.schemas import DatasetInfo, DatasetProfile, NotebookInfo

router = APIRouter(tags=["datasets"])

BUILTIN_DATASETS = [
    DatasetInfo(
        id="fish",
        name="Fish",
        filename="Fish.csv",
        rows=159,
        columns=7,
        description="생선 종류 분류 (Species)",
    ),
    DatasetInfo(
        id="pokemon",
        name="Pokemon",
        filename="Pokemon.csv",
        rows=800,
        columns=13,
        description="포켓몬 스탯 데이터",
    ),
]

ALGORITHM_NOTEBOOKS = [
    NotebookInfo(
        id="knn-1",
        title="K-Nearest Neighbors 기초",
        filename="[교사용]_1_K_Nearst_Neighbors.ipynb",
        algorithm="KNN",
    ),
    NotebookInfo(
        id="knn-2",
        title="KNN + Scaling",
        filename="[교사용]_2_K_Nearst_Neighbors(scaling).ipynb",
        algorithm="KNN",
    ),
    NotebookInfo(
        id="linear-reg",
        title="Linear Regression",
        filename="[교사용]_3_Linear_Regression.ipynb",
        algorithm="LinearRegression",
    ),
]


@router.get("/datasets", response_model=list[DatasetInfo])
def list_datasets() -> list[DatasetInfo]:
    uploads = []
    for path in settings.uploads_dir.glob("*.csv"):
        try:
            df = pd.read_csv(path, nrows=5)
            full = pd.read_csv(path)
            uploads.append(
                DatasetInfo(
                    id=path.stem,
                    name=path.stem,
                    filename=path.name,
                    rows=len(full),
                    columns=len(df.columns),
                    description="업로드된 CSV",
                )
            )
        except Exception:
            continue
    return BUILTIN_DATASETS + uploads


@router.get("/datasets/{dataset_id}", response_model=DatasetProfile)
def get_dataset_profile(dataset_id: str) -> DatasetProfile:
    path = _resolve_dataset_path(dataset_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="데이터셋을 찾을 수 없습니다.")
    df = pd.read_csv(path)
    return profile_dataframe(df, dataset_id)


@router.post("/datasets/upload", response_model=DatasetProfile)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetProfile:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드할 수 있습니다.")

    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="파일 크기는 5MB 이하여야 합니다.")

    safe_name = f"{uuid.uuid4().hex[:8]}_{Path(file.filename).name}"
    dest = settings.uploads_dir / safe_name
    dest.write_bytes(content)

    try:
        df = pd.read_csv(dest)
    except Exception as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"CSV 파싱 실패: {exc}") from exc

    return profile_dataframe(df, dest.stem)


@router.get("/notebooks", response_model=list[NotebookInfo])
def list_notebooks() -> list[NotebookInfo]:
    return ALGORITHM_NOTEBOOKS


@router.get("/notebooks/{notebook_id}")
def get_notebook(notebook_id: str) -> dict:
    info = next((n for n in ALGORITHM_NOTEBOOKS if n.id == notebook_id), None)
    if not info:
        raise HTTPException(status_code=404, detail="노트북을 찾을 수 없습니다.")
    path = settings.classipynb_dir / info.filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="노트북 파일이 없습니다.")
    import json

    return json.loads(path.read_text(encoding="utf-8"))


def _resolve_dataset_path(dataset_id: str) -> Path:
    for ds in BUILTIN_DATASETS:
        if ds.id == dataset_id:
            return settings.data_dir / ds.filename
    upload = settings.uploads_dir / f"{dataset_id}.csv"
    if upload.exists():
        return upload
    # try glob for uploaded files with prefix
    matches = list(settings.uploads_dir.glob(f"*_{dataset_id}.csv")) + list(
        settings.uploads_dir.glob(f"*{dataset_id}*.csv")
    )
    if matches:
        return matches[0]
    return settings.data_dir / f"{dataset_id}.csv"
