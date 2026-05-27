"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Props = {
  onAddCell: () => void;
  onRunAll: () => void;
  running: boolean;
};

export function CellToolbar({ onAddCell, onRunAll, running }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onAddCell}>
        <Plus className="mr-1 h-4 w-4" /> 셀 추가
      </Button>
      <Button variant="secondary" size="sm" onClick={onRunAll} disabled={running}>
        전체 실행
      </Button>
    </div>
  );
}
