"use client";

import { NotebookShell } from "@/components/notebook/NotebookShell";
import { useApiKeyStore } from "@/lib/apiKeyStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LabPage() {
  const router = useRouter();
  const verified = useApiKeyStore((s) => s.verified);
  const apiKey = useApiKeyStore((s) => s.apiKey);

  useEffect(() => {
    if (!verified || !apiKey) {
      router.replace("/");
    }
  }, [verified, apiKey, router]);

  if (!verified || !apiKey) {
    return null;
  }

  return <NotebookShell />;
}
