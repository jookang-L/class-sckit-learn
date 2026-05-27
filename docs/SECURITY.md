# 보안 정책

## 샌드박스 계층

### 1. 프로세스 격리
- 세션당 1개 Python subprocess
- 다른 세션 globals 공유 없음

### 2. AST 화이트리스트
- 허용: numpy, pandas, sklearn, matplotlib, seaborn, math, random 등
- 차단: os, sys, subprocess, socket, requests, pickle, __import__ 등
- 차단: eval, exec(학생 코드), compile, open

### 3. 리소스 제한 (Linux/Render)
| 리소스 | 제한 |
|--------|------|
| CPU | 5초 |
| 메모리 | 512MB |
| 파일 크기 | 5MB |
| fork | 차단 |

### 4. 네트워크
- worker 시작 시 socket 패치로 차단

### 5. 파일 접근
- `pd.read_csv` 래퍼: data/, uploads/ 경로만 허용

### 6. 타임아웃
- signal.alarm(5) + manager wait timeout

## Windows 로컬 개발

- RLIMIT 미적용 (OS 제한)
- AST + 타임아웃 + 프로세스 격리만 적용
- **프로덕션은 Linux(Render)에서 전체 정책 적용**

## API Key

- Gemini Key: 브라우저 zustand 메모리 only
- 서버 저장/로그 금지
- 새로고침 시 재입력 필요 (의도적)

## 업로드

- CSV only, 5MB 제한
- UUID prefix 파일명으로 경로 traversal 방지
