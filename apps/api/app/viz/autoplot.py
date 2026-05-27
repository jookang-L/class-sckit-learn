from __future__ import annotations

import base64
import io
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.base import BaseEstimator
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier, plot_tree

ALGO_CLASS_HINTS: dict[str, tuple[str, ...]] = {
    "knn": ("kneighborsclassifier", "kneighborsregressor", "knn"),
    "linearregression": ("linearregression",),
    "logisticregression": ("logisticregression",),
    "decisiontree": ("decisiontreeclassifier", "decisiontreeregressor", "decisiontree"),
}


def _unwrap_estimator(est: BaseEstimator) -> BaseEstimator:
    if isinstance(est, Pipeline):
        final = est.steps[-1][1]
        if isinstance(final, BaseEstimator):
            return final
    return est


def _estimator_matches(est: BaseEstimator, algorithm: str | None) -> bool:
    if not algorithm:
        return False
    class_name = type(est).__name__.lower()
    key = algorithm.lower().replace(" ", "").replace("-", "")
    hints = ALGO_CLASS_HINTS.get(key, (key,))
    return any(h in class_name or class_name.startswith(h) for h in hints)


def _fig_to_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")


def _to_numeric_2d(value: Any) -> np.ndarray | None:
    if isinstance(value, pd.DataFrame):
        num = value.select_dtypes(include=[np.number])
        if num.shape[1] >= 1:
            return num.values
        return None
    if isinstance(value, np.ndarray) and value.ndim == 2:
        return value
    if isinstance(value, np.ndarray) and value.ndim == 1:
        return value.reshape(-1, 1)
    return None


def _to_label_1d(value: Any) -> np.ndarray | None:
    if isinstance(value, pd.Series):
        if value.dtype == object or str(value.dtype) == "string":
            return LabelEncoder().fit_transform(value.astype(str))
        return value.values
    if isinstance(value, pd.DataFrame) and value.shape[1] == 1:
        return _to_label_1d(value.iloc[:, 0])
    if isinstance(value, np.ndarray) and value.ndim == 1:
        if value.dtype == object:
            return LabelEncoder().fit_transform(value.astype(str))
        return value
    return None


def _find_var(namespace: dict[str, Any], *patterns: str) -> Any:
    for pattern in patterns:
        pl = pattern.lower()
        for name, val in namespace.items():
            if name.startswith("_"):
                continue
            if name.lower() == pl or pl in name.lower():
                return val
    return None


def _pick_xy(namespace: dict[str, Any]) -> tuple[np.ndarray | None, np.ndarray | None]:
    x_raw = _find_var(
        namespace,
        "X_train",
        "x_train",
        "X_test",
        "x_test",
        "X",
        "x",
        "features",
    )
    y_raw = _find_var(
        namespace,
        "y_train",
        "y_test",
        "y",
        "target",
        "labels",
    )

    X = _to_numeric_2d(x_raw) if x_raw is not None else None
    y = _to_label_1d(y_raw) if y_raw is not None else None

    if X is None:
        for val in namespace.values():
            arr = _to_numeric_2d(val)
            if arr is not None and arr.shape[1] >= 2:
                X = arr
                break

    if y is None:
        for name, val in namespace.items():
            if name.startswith("_"):
                continue
            if name.lower().startswith("y"):
                y = _to_label_1d(val)
                if y is not None:
                    break

    return X, y


def _pick_estimator(namespace: dict[str, Any], algorithm: str | None) -> BaseEstimator | None:
    estimators = [
        (n, _unwrap_estimator(v))
        for n, v in namespace.items()
        if isinstance(v, BaseEstimator) and not n.startswith("_")
    ]
    if not estimators:
        return None
    if algorithm:
        for _, est in estimators:
            if _estimator_matches(est, algorithm):
                return est
    return estimators[-1][1]


def generate_auto_plot(namespace: dict[str, Any], algorithm: str | None = None) -> dict[str, str]:
    est = _pick_estimator(namespace, algorithm)
    X, y = _pick_xy(namespace)

    if est is None:
        raise ValueError("학습된 모델 객체를 찾을 수 없습니다.")

    class_name = type(est).__name__

    if isinstance(est, KNeighborsClassifier) and X is not None and y is not None and X.shape[1] >= 2:
        fig, ax = plt.subplots(figsize=(6, 4))
        scatter = ax.scatter(X[:, 0], X[:, 1], c=y, cmap="viridis", alpha=0.7)
        ax.set_xlabel("feature 1")
        ax.set_ylabel("feature 2")
        ax.set_title("KNN scatter plot")
        fig.colorbar(scatter, ax=ax)
        code = "plt.scatter(X.iloc[:,0], X.iloc[:,1], c=y)\nplt.show()"
        b64 = _fig_to_b64(fig)
        plt.close(fig)
        return {"image_base64": b64, "reference_code": code, "algorithm": "KNN"}

    if isinstance(est, LinearRegression) and X is not None and y is not None:
        fig, ax = plt.subplots(figsize=(6, 4))
        if X.shape[1] == 1:
            ax.scatter(X[:, 0], y, alpha=0.6, label="data")
            x_line = np.linspace(X[:, 0].min(), X[:, 0].max(), 100).reshape(-1, 1)
            if hasattr(est, "predict"):
                y_line = est.predict(x_line)
                ax.plot(x_line[:, 0], y_line, color="red", label="regression")
        else:
            preds = est.predict(X)
            ax.scatter(y, preds, alpha=0.6)
            ax.set_xlabel("actual")
            ax.set_ylabel("predicted")
        ax.set_title("Linear Regression")
        ax.legend()
        code = "plt.scatter(X[:,0], y)\nplt.plot(X[:,0], model.predict(X), color='red')"
        b64 = _fig_to_b64(fig)
        plt.close(fig)
        return {"image_base64": b64, "reference_code": code, "algorithm": "LinearRegression"}

    if isinstance(est, LogisticRegression) and X is not None and y is not None and X.shape[1] >= 2:
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.scatter(X[:, 0], X[:, 1], c=y, cmap="coolwarm", alpha=0.7)
        ax.set_title("Logistic Regression (data view)")
        code = "plt.scatter(X[:,0], X[:,1], c=y)\nplt.show()"
        b64 = _fig_to_b64(fig)
        plt.close(fig)
        return {"image_base64": b64, "reference_code": code, "algorithm": "LogisticRegression"}

    if isinstance(est, DecisionTreeClassifier):
        fig, ax = plt.subplots(figsize=(10, 6))
        plot_tree(est, filled=True, ax=ax, fontsize=8)
        ax.set_title("Decision Tree")
        code = "from sklearn.tree import plot_tree\nplot_tree(model, filled=True)\nplt.show()"
        b64 = _fig_to_b64(fig)
        plt.close(fig)
        return {"image_base64": b64, "reference_code": code, "algorithm": "DecisionTree"}

    fig, ax = plt.subplots(figsize=(5, 3))
    ax.text(0.5, 0.5, f"{class_name}\nNeed 2D X and 1D y", ha="center", va="center", fontsize=11)
    ax.axis("off")
    b64 = _fig_to_b64(fig)
    plt.close(fig)
    return {
        "image_base64": b64,
        "reference_code": "# X(2D), y(1D) 준비 후 fit → auto plot",
        "algorithm": class_name,
    }
