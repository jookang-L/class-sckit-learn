"use client";

type Props = {
  stdout?: string;
  stderr?: string;
  error?: string;
  friendlyError?: string;
  images?: string[];
  dataframes?: Array<{ name: string; shape: number[]; columns: string[]; head: Record<string, unknown>[] }>;
};

export function OutputArea({ stdout, stderr, error, friendlyError, images, dataframes }: Props) {
  if (!stdout && !stderr && !error && !images?.length && !dataframes?.length) return null;

  return (
    <div className="border-t bg-[#0d1117] p-3 font-mono text-xs space-y-2">
      {stdout && <pre className="whitespace-pre-wrap text-green-300/90">{stdout}</pre>}
      {dataframes?.map((df) => (
        <div key={df.name} className="rounded border border-border/50 p-2">
          <div className="text-primary/80 mb-1">
            DataFrame `{df.name}` — shape {df.shape.join(" × ")}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr>
                  {df.columns.map((c) => (
                    <th key={c} className="px-2 py-1 text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {df.head.map((row, i) => (
                  <tr key={i} className="border-t border-border/30">
                    {df.columns.map((c) => (
                      <td key={c} className="px-2 py-1">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {images?.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={`data:image/png;base64,${img}`} alt={`plot-${i}`} className="max-w-full rounded" />
      ))}
      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-red-300">
          <div className="font-semibold">{friendlyError || "오류가 발생했어요"}</div>
          <pre className="mt-1 whitespace-pre-wrap opacity-80">{error}</pre>
        </div>
      )}
      {stderr && !error && <pre className="whitespace-pre-wrap text-yellow-400/80">{stderr}</pre>}
    </div>
  );
}
