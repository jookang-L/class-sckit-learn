"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import { getGuidedSteps } from "./stepDefs";

type Props = {
  validations: Array<{ step_id: string; passed: boolean; reason?: string | null }>;
  currentIndex: number;
  algorithm: string;
};

export function StepProgress({ validations, currentIndex, algorithm }: Props) {
  const steps = getGuidedSteps(algorithm);
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const v = validations.find((x) => x.step_id === step.id);
        const passed = v?.passed ?? false;
        const isCurrent = i === currentIndex;
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              isCurrent && "bg-primary/10",
              passed && "step-complete"
            )}
          >
            {passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Circle className={cn("mt-0.5 h-4 w-4 shrink-0", isCurrent ? "text-primary" : "text-muted-foreground")} />
            )}
            <div>
              <div className={cn("font-medium", passed && "text-green-400")}>{step.title}</div>
              {!passed && isCurrent && v?.reason && (
                <div className="text-xs text-muted-foreground">{v.reason}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StepCard({
  stepIndex,
  algorithm,
}: {
  stepIndex: number;
  algorithm: string;
}) {
  const step = getGuidedSteps(algorithm)[stepIndex];
  if (!step) return null;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Step {stepIndex + 1}. {step.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{step.description}</p>
      </CardContent>
    </Card>
  );
}
