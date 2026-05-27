"use client";

import type { DatasetProfile } from "@/lib/api";

export function AutoAnalysis({ profile }: { profile: DatasetProfile }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
      <div className="font-medium">자동 데이터 분석</div>
      <div>shape: {profile.shape[0]} × {profile.shape[1]}</div>
      <div>
        숫자형: {profile.columns.filter((c) => c.kind === "numeric").length}개 / 문자형:{" "}
        {profile.columns.filter((c) => c.kind === "categorical").length}개
      </div>
      <div>결측치: {profile.has_missing ? "있음" : "없음"}</div>
      {profile.target_candidates.length > 0 && (
        <div>타깃 후보: {profile.target_candidates.join(", ")}</div>
      )}
      <div>
        과제 힌트:{" "}
        {profile.task_hint === "classification"
          ? "분류 가능성 높음"
          : profile.task_hint === "regression"
            ? "회귀 가능성 높음"
            : "데이터를 더 살펴보세요"}
      </div>
    </div>
  );
}
