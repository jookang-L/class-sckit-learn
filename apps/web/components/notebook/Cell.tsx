"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { OutputArea } from "./OutputArea";
import { RunButton } from "./KernelStatus";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { NotebookCell } from "@/lib/notebookSerialize";
import { useRef } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Props = {
  cell: NotebookCell;
  index: number;
  running: boolean;
  onChange: (source: string) => void;
  onRun: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canDelete: boolean;
};

export function Cell({ cell, index, running, onChange, onRun, onDelete, onMoveUp, onMoveDown, canDelete }: Props) {
  const onRunRef = useRef(onRun);
  const runningRef = useRef(running);

  onRunRef.current = onRun;
  runningRef.current = running;

  return (
    <div className="cell-focus-ring rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-1.5 bg-muted/30">
        <span className="text-xs text-muted-foreground font-mono">In [{cell.executed ? index + 1 : " "}]:</span>
        <div className="flex items-center gap-1">
          <RunButton running={running} onRun={onRun} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveUp}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveDown}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <MonacoEditor
        height={Math.max(120, (cell.source.split("\n").length + 1) * 20)}
        language="python"
        theme="vs-dark"
        value={cell.source}
        onChange={(v) => onChange(v || "")}
        onMount={(editor, monaco) => {
          editor.addAction({
            id: `run-cell-${cell.id}`,
            label: "셀 실행",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () => {
              if (!runningRef.current) onRunRef.current();
            },
          });
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          padding: { top: 8 },
          wordWrap: "on",
        }}
      />
      <OutputArea
        stdout={cell.output}
        stderr={cell.stderr}
        error={cell.error}
        friendlyError={cell.friendlyError}
        images={cell.images}
      />
    </div>
  );
}
