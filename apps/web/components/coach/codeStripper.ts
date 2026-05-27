const CODE_BLOCK = /```(?:python)?\n([\s\S]*?)```/g;
const SKLEARN_PATTERN = /(from sklearn|model\.fit|\.predict\(|train_test_split)/i;
/** $y$, $X$ 같은 LaTeX 수식 표기 → plain text */
const LATEX_INLINE = /\$([^$\n]+)\$/g;

export type StripResult = {
  text: string;
  stripped: boolean;
  warning?: string;
};

export function stripLaTeX(text: string): string {
  return text.replace(LATEX_INLINE, "$1");
}

export function stripAnswerCode(response: string): StripResult {
  let stripped = false;
  let warning: string | undefined;

  const processed = response.replace(CODE_BLOCK, (_match, code: string) => {
    const lines = code.trim().split("\n");
    if (lines.length > 5) {
      stripped = true;
      return "\n\n[정답 코드는 제공할 수 없어요. 대신 방향을 알려드릴게요.]\n\n";
    }
    if (lines.length <= 2 && !SKLEARN_PATTERN.test(code)) {
      return `\`${lines.join(" ")}\``;
    }
    stripped = true;
    return "\n\n[코드 예시는 개념 수준만 제공할 수 있어요.]\n\n";
  });

  if (SKLEARN_PATTERN.test(processed.replace(CODE_BLOCK, ""))) {
    warning = "sklearn 관련 구현 힌트가 포함될 수 있어요. 직접 작성해 보세요.";
  }

  return { text: stripLaTeX(processed.trim()), stripped, warning };
}
