import { API_BASE } from "./utils";

export type ExecuteResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  error_type: string | null;
  images: string[];
  dataframes_preview: Array<{
    name: string;
    shape: number[];
    columns: string[];
    head: Record<string, unknown>[];
    dtypes: Record<string, string>;
  }>;
  friendly_error: string | null;
};

export type KernelState = {
  dataframes: Array<{ name: string; shape: number[]; columns: string[]; head: Record<string, unknown>[]; dtypes: Record<string, string> }>;
  arrays: Array<{ name: string; shape: number[]; ndim: number; dtype: string }>;
  estimators: Array<{ name: string; class_name: string; fitted: boolean; params: Record<string, unknown> }>;
  last_score: number | null;
  last_predict_shape: number[] | null;
  variable_names: string[];
};

export type DatasetInfo = {
  id: string;
  name: string;
  filename: string;
  rows: number;
  columns: number;
  description: string;
};

export type DatasetProfile = {
  name: string;
  shape: number[];
  columns: Array<{ name: string; dtype: string; kind: string; missing_count: number; missing_pct: number; sample_values: string[] }>;
  has_missing: boolean;
  target_candidates: string[];
  task_hint: "classification" | "regression" | "unknown";
  preview: Record<string, unknown>[];
};

export type StepValidation = { step_id: string; passed: boolean; reason: string | null };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json();
}

export async function createSession(): Promise<string> {
  const data = await request<{ session_id: string }>("/sessions", { method: "POST" });
  return data.session_id;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await request(`/sessions/${sessionId}`, { method: "DELETE" });
}

export async function resetSession(sessionId: string): Promise<void> {
  await request(`/sessions/${sessionId}/reset`, { method: "POST" });
}

export async function executeCode(sessionId: string, code: string, cellId?: string): Promise<ExecuteResult> {
  return request(`/sessions/${sessionId}/execute`, {
    method: "POST",
    body: JSON.stringify({ code, cell_id: cellId }),
  });
}

export async function getKernelState(sessionId: string): Promise<KernelState> {
  return request(`/sessions/${sessionId}/state`);
}

export async function validateSteps(sessionId: string, algorithm?: string): Promise<StepValidation[]> {
  const query = algorithm ? `?algorithm=${encodeURIComponent(algorithm)}` : "";
  return request(`/sessions/${sessionId}/validate${query}`);
}

export async function listDatasets(): Promise<DatasetInfo[]> {
  return request("/datasets");
}

export async function getDatasetProfile(id: string): Promise<DatasetProfile> {
  return request(`/datasets/${id}`);
}

export async function uploadDataset(file: File): Promise<DatasetProfile> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/datasets/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function autoPlot(sessionId: string, algorithm?: string): Promise<{ image_base64: string; reference_code: string; algorithm: string; note: string }> {
  return request(`/sessions/${sessionId}/auto-plot`, {
    method: "POST",
    body: JSON.stringify({ algorithm }),
  });
}

export async function listNotebooks(): Promise<Array<{ id: string; title: string; filename: string; algorithm: string }>> {
  return request("/notebooks");
}

export async function getNotebook(id: string): Promise<Record<string, unknown>> {
  return request(`/notebooks/${id}`);
}

export async function healthCheck(): Promise<{ status: string; active_sessions: number }> {
  return request("/health");
}
