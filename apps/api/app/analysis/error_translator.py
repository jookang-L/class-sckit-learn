from __future__ import annotations

FRIENDLY_ERRORS: dict[str, str] = {
    "ValueError": "값의 형태나 개수가 맞지 않아요. 데이터 shape를 확인해 보세요.",
    "TypeError": "타입이 맞지 않아요. 숫자/문자/배열 타입을 다시 확인해 보세요.",
    "KeyError": "존재하지 않는 컬럼 이름을 사용했어요. df.columns를 확인해 보세요.",
    "NameError": "아직 만들지 않은 변수를 사용했어요. 이전 셀을 먼저 실행해 보세요.",
    "IndexError": "인덱스 범위를 벗어났어요. 데이터 길이를 확인해 보세요.",
    "SafetyError": "보안 정책상 허용되지 않은 코드예요. sklearn/pandas만 사용해 보세요.",
    "TimeoutError": "실행 시간이 너무 길어요. 무한 루프나 큰 연산이 있는지 확인해 보세요.",
    "ImportError": "허용되지 않은 라이브러리 import예요. sklearn, pandas 등만 사용할 수 있어요.",
    "PermissionError": "파일/네트워크 접근이 차단되었어요. 제공된 데이터 경로만 사용하세요.",
    "FileNotFoundError": "CSV 파일을 찾을 수 없어요. Fish.csv 또는 data/Fish.csv 형식으로 시도해 보세요.",
    "ZeroDivisionError": "0으로 나누려고 했어요. 데이터에 0이 있는지 확인해 보세요.",
    "AttributeError": "객체에 없는 메서드/속성을 사용했어요. sklearn API를 다시 확인해 보세요.",
}

PATTERN_HINTS: list[tuple[str, str]] = [
    (
        "inconsistent numbers of samples",
        "X와 y의 샘플 개수(행 수)가 달라요. train_test_split 후 짝이 맞는지 확인하세요.",
    ),
    (
        "could not convert string to float",
        "문자열 컬럼을 숫자 모델에 넣었을 수 있어요. 범주형은 인코딩이 필요해요.",
    ),
    (
        "Expected 2D array",
        "모델 입력은 2D 배열이어야 해요. X.shape가 (샘플수, 특성수)인지 확인하세요.",
    ),
    (
        "__import__ not found",
        "import 처리 오류예요. 백엔드를 재시작한 뒤 다시 실행해 보세요.",
    ),
    (
        "does not have valid feature names",
        "입력 데이터에 컬럼 이름이 없어요. predict할 때도 DataFrame 형태로 넣거나, 학습 때와 같은 특성 개수를 맞추세요. y가 문자열이라서가 아닙니다.",
    ),
    (
        "n_neighbors",
        "KNN의 k(n_neighbors)가 데이터 개수보다 클 수 없어요. k 값을 줄이거나 데이터를 더 준비해 보세요.",
    ),
    (
        "input contains nan",
        "데이터에 NaN(결측값)이 있어요. dropna()로 제거하거나 결측값을 채워 보세요.",
    ),
    (
        "failed to converge",
        "모델이 수렴하지 않았어요. LogisticRegression은 max_iter=1000 등으로 늘려 보세요.",
    ),
    (
        "unknown label type",
        "타깃(y) 타입이 모델과 맞지 않아요. 분류 모델에는 Species 같은 범주, 회귀 모델에는 Weight 같은 숫자를 쓰세요.",
    ),
    (
        "number of classes",
        "클래스(종류)가 1개뿐이에요. y에 2가지 이상 값이 있는지 확인하세요.",
    ),
    (
        "not fitted yet",
        "모델을 아직 fit()하지 않았어요. fit() 후 predict() / score() / 시각화를 시도하세요.",
    ),
]


def translate_error(error_type: str | None, error_message: str | None) -> str | None:
    if not error_type and not error_message:
        return None

    base = FRIENDLY_ERRORS.get(error_type or "", "코드 실행 중 문제가 발생했어요. 오류 메시지를 읽고 한 단계씩 확인해 보세요.")
    if error_message:
        lower = error_message.lower()
        for pattern, hint in PATTERN_HINTS:
            if pattern in lower:
                return f"{base} {hint}"
    return base
