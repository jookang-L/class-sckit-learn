"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Play, Circle } from "lucide-react";

type Props = {
  status: "idle" | "busy" | "dead";
  sessionId: string | null;
  onReset: () => void;
};

export function KernelStatus({ status, sessionId, onReset }: Props) {
  const color = status === "idle" ? "text-green-500" : status === "busy" ? "text-yellow-500" : "text-red-500";
  const label = status === "idle" ? "준비됨" : status === "busy" ? "실행 중" : "오류";

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        {status === "busy" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Circle className={`h-3 w-3 fill-current ${color}`} />}
        커널: {label}
      </span>
      {sessionId && <span className="font-mono truncate max-w-[120px]">{sessionId.slice(0, 8)}...</span>}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onReset}>
        세션 초기화
      </Button>
    </div>
  );
}

export function RunButton({ running, onRun }: { running: boolean; onRun: () => void }) {
  return (
    <Button size="sm" onClick={onRun} disabled={running} className="gap-1.5">
      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      실행
    </Button>
  );
}
