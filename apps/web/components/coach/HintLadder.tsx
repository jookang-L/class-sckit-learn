"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onHint: (level: 1 | 2 | 3) => void;
  disabled?: boolean;
};

export function HintLadder({ onHint, disabled }: Props) {
  return (
    <div className="flex gap-1 px-4 py-2 border-b">
      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={disabled} onClick={() => onHint(1)}>
        Hint 1
      </Button>
      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={disabled} onClick={() => onHint(2)}>
        Hint 2
      </Button>
      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={disabled} onClick={() => onHint(3)}>
        Concept
      </Button>
    </div>
  );
}
