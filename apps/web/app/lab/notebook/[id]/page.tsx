"use client";

import { Button } from "@/components/ui/button";
import { getNotebook } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type IpynbCell = {
  cell_type: string;
  source: string | string[];
  outputs?: unknown[];
};

export default function NotebookViewerPage() {
  const params = useParams();
  const id = params.id as string;
  const [cells, setCells] = useState<IpynbCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotebook(id)
      .then((nb) => setCells((nb.cells as IpynbCell[]) || []))
      .catch(() => setCells([]))
      .finally(() => setLoading(false));
  }, [id]);

  const renderSource = (source: string | string[]) => {
    const text = Array.isArray(source) ? source.join("") : source;
    return text;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Link href="/lab">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> 실습으로
          </Button>
        </Link>
        <h1 className="font-semibold">교사용 참고 노트북</h1>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {loading && <p className="text-muted-foreground">불러오는 중...</p>}
        {cells.map((cell, i) => (
          <div key={i} className="rounded-lg border overflow-hidden">
            {cell.cell_type === "markdown" ? (
              <div className="p-4 prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                {renderSource(cell.source)}
              </div>
            ) : (
              <pre className="p-4 bg-[#0d1117] text-sm font-mono overflow-x-auto">{renderSource(cell.source)}</pre>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
