"use client";

import { Button } from "@/components/ui/button";
import { stripAnswerCode } from "./codeStripper";
import { HintLadder } from "./HintLadder";
import { QuickActions } from "./QuickActions";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "coach"; text: string; warning?: string };

type Props = {
  messages: Message[];
  loading: boolean;
  onSend: (text: string, hintLevel?: 1 | 2 | 3) => void;
  onQuickAction: (action: string) => void;
  onClear: () => void;
};

export function CoachPanel({ messages, loading, onSend, onQuickAction, onClear }: Props) {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const coachMessages = messages.filter((m) => m.role === "coach");
  const latestCoach = coachMessages[coachMessages.length - 1];
  const previousMessages = messages.slice(0, -1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
    setShowHistory(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 flex items-start justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-semibold text-sm">AI 코치</h2>
          <p className="text-xs text-muted-foreground mt-0.5">정답 코드 없이 힌트만 제공합니다</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={onClear}>
            <Trash2 className="h-3 w-3 mr-1" /> 지우기
          </Button>
        )}
      </div>

      <QuickActions onAction={onQuickAction} disabled={loading} />
      <HintLadder onHint={(level) => onSend("", level)} disabled={loading} />

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4">
        <div className="py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">코드를 실행한 뒤 AI에게 질문하거나 빠른 힌트를 눌러보세요.</p>
          )}

          {previousMessages.length > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? "이전 대화 접기" : `이전 대화 ${previousMessages.length}개 보기`}
            </button>
          )}

          {showHistory &&
            previousMessages.map((m, i) => (
              <div
                key={`hist-${i}`}
                className={`rounded-lg p-2.5 text-xs opacity-70 ${m.role === "coach" ? "bg-muted/40" : "bg-primary/5 ml-3"}`}
              >
                <div className="text-[10px] text-muted-foreground mb-0.5">{m.role === "coach" ? "코치" : "나"}</div>
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
              </div>
            ))}

          {latestCoach && (
            <div className="rounded-lg border border-primary/20 bg-muted/50 p-3 text-sm">
              <div className="text-xs font-medium text-primary mb-2">코치 · 최신 힌트</div>
              <div className="whitespace-pre-wrap leading-relaxed">{latestCoach.text}</div>
              {latestCoach.warning && <div className="mt-2 text-xs text-amber-400">{latestCoach.warning}</div>}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> 생각 중...
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-3 flex gap-2 shrink-0">
        <input
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="질문하기..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button size="icon" onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function processCoachResponse(raw: string): { text: string; warning?: string } {
  const result = stripAnswerCode(raw);
  return { text: result.text, warning: result.warning };
}
