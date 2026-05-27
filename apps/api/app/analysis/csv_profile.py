from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.schemas import ColumnProfile, DatasetProfile


def _column_kind(series: pd.Series) -> str:
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if pd.api.types.is_string_dtype(series) or pd.api.types.is_object_dtype(series):
        return "categorical"
    return "other"


def _suggest_targets(df: pd.DataFrame) -> list[str]:
    candidates: list[str] = []
    for col in df.columns:
        series = df[col]
        kind = _column_kind(series)
        unique = series.nunique(dropna=True)
        if kind == "categorical" and 2 <= unique <= 20:
            candidates.append(str(col))
        elif kind == "numeric" and unique > 5:
            candidates.append(str(col))
    # Prefer last column and common names
    priority = {"Species", "species", "target", "label", "class", "y", "Type 1", "Legendary"}
    candidates.sort(key=lambda c: (c not in priority, c))
    return candidates[:5]


def _task_hint(df: pd.DataFrame, targets: list[str]) -> str:
    if not targets:
        return "unknown"
    target = targets[0]
    series = df[target]
    if _column_kind(series) == "categorical":
        return "classification"
    if _column_kind(series) == "numeric":
        return "regression"
    return "unknown"


def profile_dataframe(df: pd.DataFrame, name: str) -> DatasetProfile:
    columns: list[ColumnProfile] = []
    has_missing = False
    for col in df.columns:
        series = df[col]
        missing = int(series.isna().sum())
        if missing:
            has_missing = True
        kind = _column_kind(series)
        samples = [str(v) for v in series.dropna().head(3).tolist()]
        columns.append(
            ColumnProfile(
                name=str(col),
                dtype=str(series.dtype),
                kind=kind,  # type: ignore
                missing_count=missing,
                missing_pct=round(missing / max(len(df), 1) * 100, 2),
                sample_values=samples,
            )
        )

    targets = _suggest_targets(df)
    preview = df.head(5).replace({np.nan: None}).to_dict(orient="records")

    return DatasetProfile(
        name=name,
        shape=[len(df), len(df.columns)],
        columns=columns,
        has_missing=has_missing,
        target_candidates=targets,
        task_hint=_task_hint(df, targets),  # type: ignore
        preview=preview,
    )
