import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";

/** Google AI Studio 기본 모델 (2026). 구형 모델은 fallback. */
export const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"] as const;
export const GEMINI_MODEL = GEMINI_MODELS[0];

export const COACH_SYSTEM_PROMPT = `너는 한국 고등학생의 scikit-learn 학습 코치다.
절대 정답 코드, 완성 셀, 복붙 가능한 코드, 전체 구현을 제공하지 마라.
허용: 오류 원인 설명, 개념 설명, 디버깅 방향, 현재 단계 확인 요소, sklearn 개념 연결, 결과 해석.
스타일: 짧고 명확, 질문형 유도, 사고 유도형, 현재 상태 중심.
한국어로 3~5문장 이내로 답하라.
변수명은 X, y처럼 일반 텍스트로 쓰고, $기호나 LaTeX/마크다운 수식 표기는 사용하지 마라.`;

type GenerateOptions = {
  maxOutputTokens?: number;
  temperature?: number;
  /** 연결 테스트 등 짧은 응답 — thinking 비활성화 */
  disableThinking?: boolean;
};

function createClient(apiKey: string) {
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

function parseError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isModelNotFound(err: unknown): boolean {
  const msg = parseError(err).toLowerCase();
  return msg.includes("not found") || msg.includes("404") || msg.includes("does not exist");
}

/** SDK .text 외 parts에서 직접 텍스트 추출 (thinking-only 응답 대비) */
function extractText(response: GenerateContentResponse): string | undefined {
  const fromGetter = response.text;
  if (fromGetter) return fromGetter;

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  let text = "";
  for (const part of parts) {
    if (typeof part.text === "string" && !part.thought) {
      text += part.text;
    }
  }
  return text || undefined;
}

function buildConfig(options?: GenerateOptions) {
  const config: Record<string, unknown> = {
    maxOutputTokens: options?.maxOutputTokens,
    temperature: options?.temperature,
  };
  // gemini-3.5-flash: thinking이 출력 토큰을 먼저 소비 → 짧은 maxOutputTokens면 text가 비어 보임
  if (options?.disableThinking) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

async function generateWithFallback(
  apiKey: string,
  contents: string,
  options?: GenerateOptions
): Promise<string> {
  const client = createClient(apiKey);
  let lastError: unknown;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents,
        config: buildConfig(options),
      });

      const text = extractText(response);
      if (text) return text;

      // API는 성공했지만 본문만 없는 경우 (토큰 부족/차단)
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        throw new Error("응답 토큰이 부족합니다. 다시 시도해 주세요.");
      }
      if (finishReason === "SAFETY") {
        throw new Error("안전 필터에 의해 응답이 차단되었습니다.");
      }
      throw new Error("Gemini 응답이 비어 있습니다.");
    } catch (err) {
      lastError = err;
      if (isModelNotFound(err)) continue;
      throw err;
    }
  }

  throw lastError ?? new Error("사용 가능한 Gemini 모델을 찾을 수 없습니다.");
}

/** 연결 테스트: 텍스트 내용 검증 없이 API 호출 성공 여부만 확인 */
async function pingGemini(apiKey: string): Promise<void> {
  const client = createClient(apiKey);
  let lastError: unknown;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: 'Reply with exactly one word: "ok"',
        config: buildConfig({ maxOutputTokens: 64, disableThinking: true }),
      });

      if (response.candidates && response.candidates.length > 0) return;
      throw new Error("Gemini 응답 후보가 없습니다.");
    } catch (err) {
      lastError = err;
      if (isModelNotFound(err)) continue;
      throw err;
    }
  }

  throw lastError ?? new Error("사용 가능한 Gemini 모델을 찾을 수 없습니다.");
}

export async function testGeminiConnection(apiKey: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed.startsWith("AIza")) {
    return { ok: false, message: "API Key 형식이 올바르지 않습니다. AIza로 시작하는 키인지 확인해 주세요." };
  }

  try {
    await pingGemini(trimmed);
    return { ok: true };
  } catch (e) {
    const detail = parseError(e);
    if (detail.includes("API key not valid") || detail.includes("API_KEY_INVALID")) {
      return { ok: false, message: "API Key가 유효하지 않습니다. Google AI Studio에서 새 키를 발급받았는지 확인해 주세요." };
    }
    if (detail.includes("403") || detail.includes("PERMISSION_DENIED")) {
      return {
        ok: false,
        message: "API 사용 권한이 없습니다. Google AI Studio에서 Generative Language API가 활성화됐는지 확인해 주세요.",
      };
    }
    return { ok: false, message: `Gemini 연결 실패: ${detail}` };
  }
}

export type CoachContext = {
  mode: "guided" | "free";
  algorithm: string;
  dataset: string;
  currentStep?: string;
  cells: Array<{ code: string; output?: string; error?: string }>;
  kernelState?: Record<string, unknown>;
  hintLevel?: 1 | 2 | 3;
  quickAction?: string;
};

export async function askCoach(apiKey: string, context: CoachContext, userMessage?: string): Promise<string> {
  const hintLabels = ["", "Hint 1 (가벼운 단서)", "Hint 2 (개념 연결)", "Concept Hint (개념 설명)"];
  const hintInstruction = context.hintLevel
    ? `\n힌트 단계: ${hintLabels[context.hintLevel]}. 정답 코드는 여전히 금지.`
    : "";

  const prompt = `${COACH_SYSTEM_PROMPT}${hintInstruction}

[현재 컨텍스트]
- 모드: ${context.mode}
- 알고리즘: ${context.algorithm}
- 데이터셋: ${context.dataset}
- 현재 단계: ${context.currentStep || "없음"}
- 변수 상태: ${JSON.stringify(context.kernelState || {}, null, 0)}

[노트북 셀]
${context.cells.map((c, i) => `--- Cell ${i + 1} ---\n${c.code}\n[출력]\n${c.output || ""}\n[오류]\n${c.error || ""}`).join("\n")}

${context.quickAction ? `[빠른 힌트 요청] ${context.quickAction}` : ""}
${userMessage ? `[학생 질문] ${userMessage}` : ""}`;

  return generateWithFallback(apiKey, prompt, {
    temperature: 0.7,
    maxOutputTokens: 1024,
    disableThinking: true,
  });
}
