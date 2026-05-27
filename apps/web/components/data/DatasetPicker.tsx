"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DatasetInfo, DatasetProfile } from "@/lib/api";
import { Upload } from "lucide-react";
import { useRef } from "react";
import { AutoAnalysis } from "./AutoAnalysis";

type Props = {
  datasets: DatasetInfo[];
  selectedId: string;
  profile: DatasetProfile | null;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void;
  loading?: boolean;
};

export function DatasetPicker({ datasets, selectedId, profile, onSelect, onUpload, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">데이터셋</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selectedId} onValueChange={onSelect}>
          <SelectTrigger>
            <SelectValue placeholder="데이터셋 선택" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} ({d.rows}행 × {d.columns}열)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()} disabled={loading}>
          <Upload className="mr-2 h-4 w-4" /> CSV 업로드 (최대 5MB)
        </Button>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        {profile && <AutoAnalysis profile={profile} />}
      </CardContent>
    </Card>
  );
}
