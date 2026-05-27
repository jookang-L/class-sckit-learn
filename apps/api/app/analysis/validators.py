from __future__ import annotations

from app.schemas import ArrayInfo, KernelState, StepValidationResult

NEEDS_SCALING = frozenset({"KNN", "LogisticRegression"})
SCALER_CLASSES = frozenset({"StandardScaler", "MinMaxScaler", "RobustScaler"})


def _is_target_name(name: str) -> bool:
    lower = name.lower()
    if lower in {"y", "target", "labels", "species", "label"}:
        return True
    if lower.startswith("y_") or lower.startswith("y_train") or lower.startswith("y_test"):
        return True
    if lower.endswith("_y"):
        return True
    return False


def _array_is_y(arr: ArrayInfo) -> bool:
    if arr.ndim == 1:
        return True
    if arr.ndim == 2 and len(arr.shape) == 2 and arr.shape[1] == 1:
        return _is_target_name(arr.name)
    return False


def _array_is_x(arr: ArrayInfo) -> bool:
    if arr.ndim != 2:
        return False
    if len(arr.shape) == 2 and arr.shape[1] == 1 and _is_target_name(arr.name):
        return False
    return True


def _has_train_test_split(state: KernelState) -> bool:
    names = {a.name.lower() for a in state.arrays}
    has_x_split = "x_train" in names and "x_test" in names
    has_y_split = "y_train" in names and "y_test" in names
    if has_x_split and has_y_split:
        return True

    x_arrays = [a for a in state.arrays if _array_is_x(a)]
    y_arrays = [a for a in state.arrays if _array_is_y(a)]
    return len(x_arrays) >= 2 and len(y_arrays) >= 2


def _has_scaling(state: KernelState) -> bool:
    if any(e.class_name in SCALER_CLASSES and e.fitted for e in state.estimators):
        return True

    names = {a.name.lower() for a in state.arrays}
    scaled_names = {
        "x_train_s",
        "x_test_s",
        "x_train_scaled",
        "x_test_scaled",
    }
    if scaled_names & names:
        return True

    return any(
        name.startswith("x")
        and (name.endswith("_s") or "scaled" in name)
        and name not in {"x_train", "x_test"}
        for name in names
    )


def validate_steps(state: KernelState, algorithm: str | None = None) -> list[StepValidationResult]:
    results: list[StepValidationResult] = []

    passed = len(state.dataframes) >= 1
    results.append(
        StepValidationResult(
            step_id="load_data",
            passed=passed,
            reason=None if passed else "DataFrame이 아직 없어요. CSV를 불러와 보세요.",
        )
    )

    has_x = any(_array_is_x(a) for a in state.arrays)
    has_y = any(_array_is_y(a) for a in state.arrays)
    passed = has_x and has_y
    results.append(
        StepValidationResult(
            step_id="split_xy",
            passed=passed,
            reason=None
            if passed
            else "특성(X)과 타깃(y)을 나눠 보세요. X는 2D, y는 1D(Series) 또는 y 이름의 1열 배열입니다.",
        )
    )

    passed = _has_train_test_split(state)
    results.append(
        StepValidationResult(
            step_id="train_test_split",
            passed=passed,
            reason=None if passed else "train_test_split으로 X_train, X_test, y_train, y_test를 만들어 보세요.",
        )
    )

    if algorithm in NEEDS_SCALING:
        passed = _has_scaling(state)
        results.append(
            StepValidationResult(
                step_id="scale_features",
                passed=passed,
                reason=None
                if passed
                else "StandardScaler로 X_train에 fit()한 뒤 X_train/X_test를 transform()해 보세요.",
            )
        )

    passed = len(state.estimators) >= 1 and any(
        e.class_name not in SCALER_CLASSES for e in state.estimators
    )
    results.append(
        StepValidationResult(
            step_id="create_model",
            passed=passed,
            reason=None if passed else "sklearn 모델 객체를 아직 만들지 않았어요.",
        )
    )

    passed = any(e.fitted and e.class_name not in SCALER_CLASSES for e in state.estimators)
    results.append(
        StepValidationResult(
            step_id="fit_model",
            passed=passed,
            reason=None if passed else "모델을 fit()으로 학습시켜 보세요.",
        )
    )

    passed = state.did_predict
    results.append(
        StepValidationResult(
            step_id="predict",
            passed=passed,
            reason=None
            if passed
            else "predict()를 실행해 보세요. 결과를 preds 같은 변수에 저장하면 더 잘 인식돼요.",
        )
    )

    passed = state.did_score or state.last_score is not None
    results.append(
        StepValidationResult(
            step_id="score",
            passed=passed,
            reason=None
            if passed
            else "score() 결과를 변수에 저장하거나 print(model.score(...))로 출력해 보세요.",
        )
    )

    return results
