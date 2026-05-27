const PATTERN_HINTS: Array<[RegExp, string]> = [
  [/inconsistent numbers of samples/i, "X와 y의 샘플 개수(행 수)가 달라요."],
  [/could not convert string to float/i, "문자열 컬럼을 숫자 모델에 넣었을 수 있어요."],
  [/Expected 2D array/i, "모델 입력은 2D 배열이어야 해요."],
  [/nan/i, "결측치(NaN)가 있을 수 있어요."],
];

const TYPE_MESSAGES: Record<string, string> = {
  ValueError: "값의 형태나 개수가 맞지 않아요.",
  TypeError: "타입이 맞지 않아요.",
  KeyError: "존재하지 않는 컬럼 이름을 사용했어요.",
  NameError: "아직 만들지 않은 변수를 사용했어요.",
  IndexError: "인덱스 범위를 벗어났어요.",
  SafetyError: "보안 정책상 허용되지 않은 코드예요.",
  TimeoutError: "실행 시간이 너무 길어요.",
  PermissionError: "파일/네트워크 접근이 차단되었어요.",
  ZeroDivisionError: "0으로 나누려고 했어요.",
  AttributeError: "객체에 없는 메서드/속성을 사용했어요.",
};

export function translateError(errorType: string | null, errorMessage: string | null, friendlyFromServer?: string | null): string {
  if (friendlyFromServer) return friendlyFromServer;
  const base = TYPE_MESSAGES[errorType || ""] || "코드 실행 중 문제가 발생했어요.";
  if (errorMessage) {
    for (const [pattern, hint] of PATTERN_HINTS) {
      if (pattern.test(errorMessage)) return `${base} ${hint}`;
    }
  }
  return base;
}
