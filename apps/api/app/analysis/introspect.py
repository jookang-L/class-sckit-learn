from __future__ import annotations

import re
from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.utils.validation import check_is_fitted


def _is_fitted(estimator: BaseEstimator) -> bool:
    try:
        check_is_fitted(estimator)
        return True
    except Exception:
        if hasattr(estimator, "__sklearn_is_fitted__"):
            try:
                return bool(estimator.__sklearn_is_fitted__())
            except Exception:
                return False
        return False


def _is_target_name(name: str) -> bool:
    lower = name.lower()
    if lower in {"y", "target", "labels", "species", "label"}:
        return True
    if lower.startswith("y_") or lower.startswith("y_train") or lower.startswith("y_test"):
        return True
    if lower.endswith("_y"):
        return True
    return False


def _is_predict_name(name: str) -> bool:
    lower = name.lower()
    return "pred" in lower or lower in {"predictions", "y_hat"}


def _is_score_name(name: str) -> bool:
    lower = name.lower()
    return any(k in lower for k in ("score", "accuracy", "acc", "r2", "r_squared"))


def _score_value(value: float) -> float | None:
    fv = float(value)
    if -10.0 <= fv <= 1.0:
        return fv
    return None


def build_kernel_state(namespace: dict[str, Any]) -> dict[str, Any]:
    dataframes: list[dict[str, Any]] = []
    arrays: list[dict[str, Any]] = []
    estimators: list[dict[str, Any]] = []
    variable_names: list[str] = []
    last_score: float | None = None
    last_predict_shape: list[int] | None = None
    did_predict = False
    did_score = False

    lab_flags = namespace.get("_lab_flags") or {}
    if isinstance(lab_flags, dict):
        did_predict = bool(lab_flags.get("predict"))
        did_score = bool(lab_flags.get("score"))
        sv = lab_flags.get("score_value")
        if isinstance(sv, (int, float)):
            parsed = _score_value(float(sv))
            if parsed is not None:
                last_score = parsed

    for name, value in namespace.items():
        if name.startswith("_") or name in {"np", "pd", "plt"}:
            continue
        variable_names.append(name)

        if isinstance(value, pd.DataFrame):
            head = value.head(3).replace({np.nan: None}).to_dict(orient="records")
            dataframes.append(
                {
                    "name": name,
                    "shape": list(value.shape),
                    "columns": [str(c) for c in value.columns.tolist()],
                    "head": head,
                    "dtypes": {str(k): str(v) for k, v in value.dtypes.items()},
                }
            )
            if value.shape[1] >= 1 and value.shape[0] > 0:
                arrays.append(
                    {
                        "name": name,
                        "shape": list(value.shape),
                        "ndim": 2,
                        "dtype": "dataframe",
                    }
                )
        elif isinstance(value, pd.Series):
            arrays.append(
                {
                    "name": name,
                    "shape": [len(value)],
                    "ndim": 1,
                    "dtype": str(value.dtype),
                }
            )
        elif isinstance(value, np.ndarray):
            arrays.append(
                {
                    "name": name,
                    "shape": list(value.shape),
                    "ndim": int(value.ndim),
                    "dtype": str(value.dtype),
                }
            )
            if value.ndim == 1 and _is_predict_name(name):
                last_predict_shape = list(value.shape)
                did_predict = True
        elif isinstance(value, BaseEstimator):
            estimators.append(
                {
                    "name": name,
                    "class_name": type(value).__name__,
                    "fitted": _is_fitted(value),
                    "params": {k: v for k, v in value.get_params().items() if isinstance(v, (int, float, str, bool, type(None)))},
                }
            )
        elif isinstance(value, (int, float)):
            fv = float(value)
            parsed = _score_value(fv)
            if _is_score_name(name) and parsed is not None:
                last_score = parsed
                did_score = True

    # predict: pred 이름 변수만 인정 (y, y_train 등 제외)
    for arr in arrays:
        if arr["ndim"] == 1 and _is_predict_name(arr["name"]):
            last_predict_shape = arr["shape"]
            did_predict = True

    return {
        "dataframes": dataframes,
        "arrays": arrays,
        "estimators": estimators,
        "last_score": last_score,
        "last_predict_shape": last_predict_shape,
        "did_predict": did_predict,
        "did_score": did_score,
        "variable_names": variable_names,
    }
