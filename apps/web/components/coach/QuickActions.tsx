"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3, CheckSquare, Database } from "lucide-react";

const ACTIONS = [
  { id: "error", label: "오류 힌트", icon: AlertCircle },
  { id: "step", label: "현재 단계", icon: CheckSquare },
  { id: "result", label: "결과 해석", icon: BarChart3 },
  { id: "data", label: "데이터 분석", icon: Database },
];

type Props = {
  onAction: (action: string) => void;
  disabled?: boolean;
};

export function QuickActions({ onAction, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1.5 px-4 py-2">
      {ACTIONS.map(({ id, label, icon: Icon }) => (
        <Button key={id} variant="secondary" size="sm" className="text-xs h-8" disabled={disabled} onClick={() => onAction(id)}>
          <Icon className="mr-1 h-3 w-3" />
          {label}
        </Button>
      ))}
    </div>
  );
}

export const QUICK_ACTION_PROMPTS: Record<string, string> = {
  error: "마지막 셀의 오류 원인을 개념 수준에서 설명해 주세요. 정답 코드는 주지 마세요.",
  step: "현재 실습 단계에서 무엇을 확인해야 하는지 질문형으로 알려주세요.",
  result: "마지막 실행 결과를 해석하는 데 도움을 주세요. 정답 코드는 주지 마세요.",
  data: "현재 데이터 상태를 바탕으로 다음에 고려할 점을 알려주세요.",
};
