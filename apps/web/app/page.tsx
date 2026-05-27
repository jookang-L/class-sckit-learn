"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApiKeyStore } from "@/lib/apiKeyStore";
import { testGeminiConnection } from "@/lib/gemini";
import { Brain, KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const { setApiKey, setVerified } = useApiKeyStore();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!key.trim()) {
      setError("API Key를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await testGeminiConnection(key.trim());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setApiKey(key.trim());
      setVerified(true);
      router.push("/lab");
    } catch (e) {
      setError(e instanceof Error ? e.message : "연결 테스트 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sckit-Learn Lab</CardTitle>
          <CardDescription>
            고등학생을 위한 sklearn 실습 플랫폼
            <br />
            Gemini API Key를 입력하면 시작할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Gemini API Key
            </label>
            <Input
              type="password"
              placeholder="AIza..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            <p className="text-xs text-muted-foreground">
              API Key는 브라우저 메모리에만 저장되며 서버로 전송되지 않습니다.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleConnect} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 연결 테스트 중...
              </>
            ) : (
              "연결하고 시작하기"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
