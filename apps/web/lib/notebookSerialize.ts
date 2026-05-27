export type NotebookCell = {
  id: string;
  type: "code" | "markdown";
  source: string;
  output?: string;
  stderr?: string;
  error?: string;
  errorType?: string;
  friendlyError?: string;
  images?: string[];
  executed?: boolean;
};

export function exportToPy(cells: NotebookCell[], title: string): string {
  const lines = [`# ${title}`, ""];
  for (const cell of cells) {
    if (cell.type === "markdown") {
      lines.push(`# ${cell.source.replace(/\n/g, "\n# ")}`, "");
    } else {
      lines.push(cell.source, "");
    }
  }
  return lines.join("\n");
}

export function exportToIpynb(cells: NotebookCell[], title: string): string {
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python", version: "3.11.0" },
      title,
    },
    cells: cells.map((cell) => {
      if (cell.type === "markdown") {
        return { cell_type: "markdown", metadata: {}, source: cell.source.split("\n").map((l) => l + "\n") };
      }
      return {
        cell_type: "code",
        metadata: {},
        source: cell.source.split("\n").map((l) => l + "\n"),
        outputs: cell.output
          ? [{ output_type: "stream", name: "stdout", text: cell.output.split("\n").map((l) => l + "\n") }]
          : [],
        execution_count: cell.executed ? 1 : null,
      };
    }),
  };
  return JSON.stringify(nb, null, 2);
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
