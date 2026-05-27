"use client";

import { Cell } from "@/components/notebook/Cell";
import { CellToolbar } from "@/components/notebook/CellToolbar";
import { KernelStatus } from "@/components/notebook/KernelStatus";
import { CoachPanel, processCoachResponse } from "@/components/coach/CoachPanel";
import { QUICK_ACTION_PROMPTS } from "@/components/coach/QuickActions";
import { DatasetPicker } from "@/components/data/DatasetPicker";
import { StepCard, StepProgress } from "@/components/guided/StepCard";
import { computeProgress, getCurrentStepIndex, getEmptyNotebookCells, getGuidedSteps, summarizeKernelState } from "@/components/guided/stepDefs";
import { AutoPlot } from "@/components/viz/AutoPlot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  autoPlot,
  createSession,
  deleteSession,
  executeCode,
  getDatasetProfile,
  getKernelState,
  listDatasets,
  listNotebooks,
  uploadDataset,
  validateSteps,
  type DatasetInfo,
  type DatasetProfile,
  type KernelState,
  type StepValidation,
} from "@/lib/api";
import { useApiKeyStore } from "@/lib/apiKeyStore";
import { askCoach } from "@/lib/gemini";
import { downloadFile, exportToIpynb, exportToPy, type NotebookCell } from "@/lib/notebookSerialize";
import { clearStoredSessionId, getLabPreferences, getStoredSessionId, setLabPreferences, setStoredSessionId } from "@/lib/session";
import { ALGORITHM_THEMES } from "@/lib/utils";
import { Download, LogOut, BookOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function newCell(source = ""): NotebookCell {
  return { id: crypto.randomUUID(), type: "code", source };
}

export function NotebookShell() {
  const apiKey = useApiKeyStore((s) => s.apiKey);
  const clearKey = useApiKeyStore((s) => s.clear);

  const prefs = getLabPreferences();
  const [mode, setMode] = useState<"guided" | "free">(prefs.mode);
  const [algorithm, setAlgorithm] = useState(prefs.algorithm);
  const [datasetId, setDatasetId] = useState(prefs.datasetId);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [kernelStatus, setKernelStatus] = useState<"idle" | "busy" | "dead">("idle");
  const [cells, setCells] = useState<NotebookCell[]>([]);
  const [runningCellId, setRunningCellId] = useState<string | null>(null);
  const [kernelState, setKernelState] = useState<KernelState | null>(null);
  const [validations, setValidations] = useState<StepValidation[]>([]);
  const [coachMessages, setCoachMessages] = useState<Array<{ role: "user" | "coach"; text: string; warning?: string }>>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [plotImage, setPlotImage] = useState<string | null>(null);
  const [plotCode, setPlotCode] = useState<string | null>(null);
  const [plotAlgo, setPlotAlgo] = useState<string | null>(null);
  const [plotLoading, setPlotLoading] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [notebooks, setNotebooks] = useState<Array<{ id: string; title: string; algorithm: string }>>([]);
  const [initDone, setInitDone] = useState(false);

  const theme = ALGORITHM_THEMES[algorithm] || ALGORITHM_THEMES.KNN;
  const currentStepIndex = getCurrentStepIndex(validations, algorithm);
  const progress = computeProgress(validations, algorithm);
  const guidedSteps = getGuidedSteps(algorithm);

  const initSession = useCallback(async () => {
    let sid = getStoredSessionId();
    if (sid) {
      try {
        await getKernelState(sid);
      } catch {
        sid = null;
      }
    }
    if (!sid) {
      sid = await createSession();
      setStoredSessionId(sid);
    }
    setSessionId(sid);
    setKernelStatus("idle");
  }, []);

  const loadDatasetProfile = useCallback(async (id: string) => {
    try {
      const p = await getDatasetProfile(id);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const ds = await listDatasets();
      setDatasets(ds);
      const nb = await listNotebooks();
      setNotebooks(nb);
      await initSession();
      await loadDatasetProfile(datasetId);
      setCells(getEmptyNotebookCells().map((s) => newCell(s)));
      setInitDone(true);
    })();
    return () => {
      const sid = getStoredSessionId();
      if (sid) deleteSession(sid).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLabPreferences({ mode, algorithm, datasetId });
  }, [mode, algorithm, datasetId]);

  useEffect(() => {
    if (!sessionId || !initDone) return;
    validateSteps(sessionId, algorithm).then(setValidations).catch(() => {});
  }, [algorithm, sessionId, initDone]);

  const refreshState = async (sid: string) => {
    const [state, vals] = await Promise.all([getKernelState(sid), validateSteps(sid, algorithm)]);
    setKernelState(state);
    setValidations(vals);
  };

  const runCell = async (cellId: string) => {
    if (!sessionId) return;
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return;

    setRunningCellId(cellId);
    setKernelStatus("busy");
    try {
      const result = await executeCode(sessionId, cell.source, cellId);
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                executed: true,
                output: result.stdout || undefined,
                stderr: result.stderr || undefined,
                error: result.error || undefined,
                errorType: result.error_type || undefined,
                friendlyError: result.friendly_error || undefined,
                images: result.images,
              }
            : c
        )
      );
      await refreshState(sessionId);
      setKernelStatus("idle");
    } catch (e) {
      setKernelStatus("dead");
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId ? { ...c, error: e instanceof Error ? e.message : "실행 실패", friendlyError: "서버 연결 오류" } : c
        )
      );
    } finally {
      setRunningCellId(null);
    }
  };

  const runAll = async () => {
    for (const cell of cells) {
      await runCell(cell.id);
    }
  };

  const handleCoach = async (userMessage?: string, hintLevel?: 1 | 2 | 3, quickAction?: string) => {
    if (!apiKey) return;
    setCoachLoading(true);
    const isUserQuestion = Boolean(userMessage?.trim());

    if (isUserQuestion) {
      setCoachMessages((m) => [...m, { role: "user", text: userMessage! }]);
    }

    try {
      const raw = await askCoach(apiKey, {
        mode,
        algorithm,
        dataset: datasetId,
        currentStep: guidedSteps[currentStepIndex]?.title,
        cells: cells.map((c) => ({ code: c.source, output: c.output, error: c.error || c.friendlyError })),
        kernelState: kernelState as unknown as Record<string, unknown>,
        hintLevel,
        quickAction,
      }, userMessage);
      const processed = processCoachResponse(raw);
      const coachMsg = { role: "coach" as const, text: processed.text, warning: processed.warning };

      setCoachMessages((m) => {
        // 힌트/빠른 버튼: 이전 코치 답변을 교체 (누적 방지)
        if (!isUserQuestion && m.length > 0 && m[m.length - 1].role === "coach") {
          return [...m.slice(0, -1), coachMsg];
        }
        return [...m, coachMsg];
      });
    } catch (e) {
      const errMsg = { role: "coach" as const, text: e instanceof Error ? e.message : "AI 응답 실패" };
      setCoachMessages((m) => {
        if (!isUserQuestion && m.length > 0 && m[m.length - 1].role === "coach") {
          return [...m.slice(0, -1), errMsg];
        }
        return [...m, errMsg];
      });
    } finally {
      setCoachLoading(false);
    }
  };

  const handleReset = async () => {
    if (sessionId) {
      await deleteSession(sessionId);
    }
    clearStoredSessionId();
    const sid = await createSession();
    setStoredSessionId(sid);
    setSessionId(sid);
    setKernelStatus("idle");
    setKernelState(null);
    setValidations([]);
    setCoachMessages([]);
    setPlotImage(null);
    setCells(getEmptyNotebookCells().map((s) => newCell(s)));
  };

  const handleDatasetChange = async (id: string) => {
    setDatasetId(id);
    await loadDatasetProfile(id);
  };

  const handleUpload = async (file: File) => {
    const p = await uploadDataset(file);
    const ds = await listDatasets();
    setDatasets(ds);
    setDatasetId(p.name);
    setProfile(p);
  };

  const handleAutoPlot = async () => {
    if (!sessionId) return;
    setPlotLoading(true);
    setPlotError(null);
    try {
      const result = await autoPlot(sessionId, algorithm);
      setPlotImage(result.image_base64);
      setPlotCode(result.reference_code);
      setPlotAlgo(result.algorithm);
    } catch (e) {
      setPlotImage(null);
      setPlotCode(null);
      setPlotAlgo(null);
      setPlotError(e instanceof Error ? e.message : "시각화 생성에 실패했습니다.");
    } finally {
      setPlotLoading(false);
    }
  };

  if (!initDone) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">플랫폼 준비 중...</div>;
  }

  return (
    <div className="flex h-screen flex-col" style={{ "--algo-color": theme.color } as React.CSSProperties}>
      <header className="flex items-center justify-between border-b px-4 py-2 bg-card/80 backdrop-blur">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg" style={{ color: theme.color }}>
            Sckit-Learn Lab
          </h1>
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Gemini 연결됨
          </span>
          <KernelStatus status={kernelStatus} sessionId={sessionId} onReset={handleReset} />
        </div>
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <div className="flex items-center gap-1.5 rounded-md border bg-background px-1 py-0.5">
            <Select value={mode} onValueChange={(v) => setMode(v as "guided" | "free")}>
              <SelectTrigger className="h-8 w-[100px] border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guided">가이드형</SelectItem>
                <SelectItem value="free">자유 노트북</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">·</span>
            <Select value={algorithm} onValueChange={setAlgorithm}>
              <SelectTrigger className="h-8 w-[96px] border-0 bg-transparent shadow-none focus:ring-0">
                <span className="truncate">{theme.shortLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ALGORITHM_THEMES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => downloadFile(exportToPy(cells, "lab"), "lab.py", "text/plain")}>
            <Download className="h-4 w-4 mr-1" /> .py
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadFile(exportToIpynb(cells, "lab"), "lab.ipynb", "application/json")}>
            <Download className="h-4 w-4 mr-1" /> .ipynb
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { clearKey(); window.location.href = "/"; }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r overflow-y-auto p-3 space-y-3 bg-card/30">
          <DatasetPicker
            datasets={datasets}
            selectedId={datasetId}
            profile={profile}
            onSelect={handleDatasetChange}
            onUpload={handleUpload}
          />
          {mode === "guided" && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>진행률</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
              <StepProgress validations={validations} currentIndex={currentStepIndex} algorithm={algorithm} />
            </>
          )}
          <div className="rounded-lg border p-2">
            <div className="text-xs font-medium mb-2 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> 교사용 노트북
            </div>
            {notebooks
              .filter((nb) => nb.algorithm === algorithm)
              .map((nb) => (
              <a
                key={nb.id}
                href={`/lab/notebook/${nb.id}`}
                className="block text-xs text-primary hover:underline py-1"
              >
                {nb.title}
              </a>
            ))}
          </div>
          <div className="text-xs text-muted-foreground rounded border p-2">
            변수: {summarizeKernelState(kernelState)}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          {mode === "guided" && <StepCard stepIndex={currentStepIndex} algorithm={algorithm} />}
          <CellToolbar onAddCell={() => setCells((c) => [...c, newCell()])} onRunAll={runAll} running={!!runningCellId} />
          {cells.map((cell, i) => (
            <Cell
              key={cell.id}
              cell={cell}
              index={i}
              running={runningCellId === cell.id}
              onChange={(source) => setCells((prev) => prev.map((c) => (c.id === cell.id ? { ...c, source } : c)))}
              onRun={() => runCell(cell.id)}
              onDelete={() => setCells((prev) => prev.filter((c) => c.id !== cell.id))}
              onMoveUp={() =>
                setCells((prev) => {
                  if (i === 0) return prev;
                  const next = [...prev];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  return next;
                })
              }
              onMoveDown={() =>
                setCells((prev) => {
                  if (i === prev.length - 1) return prev;
                  const next = [...prev];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  return next;
                })
              }
              canDelete={cells.length > 1}
            />
          ))}
        </main>

        <aside className="w-[360px] shrink-0 flex flex-col min-h-0 overflow-hidden">
          <Tabs defaultValue="coach" className="flex flex-col h-full min-h-0">
            <TabsList className="mx-3 mt-2 grid grid-cols-2 shrink-0">
              <TabsTrigger value="coach">AI 코치</TabsTrigger>
              <TabsTrigger value="viz">시각화</TabsTrigger>
            </TabsList>
            <TabsContent value="coach" className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <CoachPanel
                messages={coachMessages}
                loading={coachLoading}
                onSend={(text, hintLevel) => handleCoach(text || undefined, hintLevel)}
                onQuickAction={(action) => handleCoach(undefined, undefined, QUICK_ACTION_PROMPTS[action])}
                onClear={() => setCoachMessages([])}
              />
            </TabsContent>
            <TabsContent value="viz" className="flex-1 overflow-y-auto p-3 m-0">
              <AutoPlot
                imageBase64={plotImage}
                referenceCode={plotCode}
                algorithm={plotAlgo}
                loading={plotLoading}
                error={plotError}
                onGenerate={handleAutoPlot}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
