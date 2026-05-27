import type { KernelState } from "@/lib/api";

export type StepRule = {
  id: string;
  title: string;
  description: string;
};

const CORE_STEPS: StepRule[] = [
  { id: "load_data", title: "데이터 불러오기", description: "pandas로 CSV 파일을 DataFrame으로 읽어옵니다." },
  { id: "split_xy", title: "특성/타깃 분리", description: "학습에 사용할 X(특성)와 y(타깃)를 나눕니다." },
  { id: "train_test_split", title: "train_test_split", description: "데이터를 학습용과 테스트용으로 나눕니다." },
  { id: "create_model", title: "모델 생성", description: "알고리즘에 맞는 sklearn 모델 객체를 만듭니다." },
  { id: "fit_model", title: "fit()", description: "학습 데이터로 모델을 학습시킵니다." },
  { id: "predict", title: "predict()", description: "테스트 데이터로 예측합니다." },
  { id: "score", title: "score()", description: "모델 성능을 점수로 확인합니다." },
];

const SCALING_STEP: StepRule = {
  id: "scale_features",
  title: "스케일링",
  description: "특성 값의 크기 차이를 줄입니다. train 데이터로 fit한 뒤 train/test 모두 transform하세요.",
};

export function needsScaling(algorithm: string): boolean {
  return algorithm === "KNN" || algorithm === "LogisticRegression";
}

export function getGuidedSteps(algorithm: string): StepRule[] {
  if (!needsScaling(algorithm)) {
    return [...CORE_STEPS];
  }
  const steps = [...CORE_STEPS];
  const insertAt = steps.findIndex((s) => s.id === "train_test_split") + 1;
  steps.splice(insertAt, 0, SCALING_STEP);
  return steps;
}

export function getEmptyNotebookCells(): string[] {
  return [""];
}

export function computeProgress(validations: Array<{ step_id: string; passed: boolean }>, algorithm: string): number {
  const steps = getGuidedSteps(algorithm);
  if (!steps.length) return 0;
  const byId = Object.fromEntries(validations.map((v) => [v.step_id, v.passed]));
  const passed = steps.filter((s) => byId[s.id]).length;
  return Math.round((passed / steps.length) * 100);
}

export function getCurrentStepIndex(
  validations: Array<{ step_id: string; passed: boolean }>,
  algorithm: string
): number {
  const steps = getGuidedSteps(algorithm);
  const byId = Object.fromEntries(validations.map((v) => [v.step_id, v.passed]));
  const idx = steps.findIndex((s) => !byId[s.id]);
  return idx === -1 ? steps.length - 1 : idx;
}

export function summarizeKernelState(state: KernelState | null): string {
  if (!state) return "변수 상태 없음";
  const parts = [
    `DataFrame ${state.dataframes.length}개`,
    `배열 ${state.arrays.length}개`,
    `모델 ${state.estimators.length}개`,
  ];
  if (state.estimators.some((e) => e.fitted)) parts.push("fit 완료");
  return parts.join(", ");
}
