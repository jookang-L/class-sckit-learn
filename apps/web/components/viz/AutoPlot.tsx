"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  imageBase64: string | null;
  referenceCode: string | null;
  algorithm: string | null;
  loading?: boolean;
  error?: string | null;
  onGenerate: () => void;
};

export function AutoPlot({ imageBase64, referenceCode, algorithm, loading, error, onGenerate }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">시각화</CardTitle>
        <Button size="sm" variant="outline" onClick={onGenerate} disabled={loading}>
          {loading ? "생성 중..." : "자동 시각화"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-xs text-destructive">{error}</p>}
        {imageBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${imageBase64}`} alt="auto plot" className="max-w-full rounded border" />
        ) : (
          <p className="text-xs text-muted-foreground">모델 fit 후 자동 시각화를 시도해 보세요.</p>
        )}
        {referenceCode && (
          <details className="text-xs">
            <summary className="cursor-pointer text-amber-400">참고용 시각화 코드 (직접 작성도 가능)</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono">{referenceCode}</pre>
          </details>
        )}
        {algorithm && <div className="text-xs text-muted-foreground">알고리즘: {algorithm}</div>}
      </CardContent>
    </Card>
  );
}
