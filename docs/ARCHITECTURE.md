# 아키텍처

## 개요

```
Browser (Next.js)
  ├─ Gemini API (직접, API Key in memory)
  └─ FastAPI (Render)
        └─ KernelManager
              └─ Python Worker (subprocess, session-scoped)
```

## 세션 모델

- 로그인 없음
- `POST /sessions` → UUID 세션 ID
- sessionStorage에 session_id 저장
- 30분 idle TTL 후 워커 자동 종료

## 코드 실행

1. 프론트가 `POST /sessions/{id}/execute` 로 코드 전송
2. KernelManager가 워커 stdin에 JSONL 메시지
3. 워커: AST 검증 → exec(globals) → stdout/figure 캡처
4. 결과 JSON 반환

## AI 코치

- Gemini 호출은 **프론트엔드 only**
- 백엔드는 kernel state / execute result만 제공
- codeStripper.ts가 코드블록 후처리 필터

## 데이터

- `apps/api/data/` — Fish.csv, Pokemon.csv
- `apps/api/uploads/` — 학생 업로드 CSV
- `pd.read_csv`는 허용 경로만 읽기 가능 (워커 패치)
