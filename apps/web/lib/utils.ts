import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ALGORITHM_THEMES: Record<string, { color: string; label: string; shortLabel: string }> = {
  KNN: { color: "#6366f1", label: "K-Nearest Neighbors", shortLabel: "KNN" },
  LinearRegression: { color: "#22c55e", label: "Linear Regression", shortLabel: "선형 회귀" },
  LogisticRegression: { color: "#f59e0b", label: "Logistic Regression", shortLabel: "로지스틱" },
  DecisionTree: { color: "#ec4899", label: "Decision Tree", shortLabel: "결정 트리" },
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
