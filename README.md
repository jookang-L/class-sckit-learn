# Sckit-Learn Lab

고등학생 대상 **Jupyter Notebook 스타일 sklearn 실습 플랫폼**입니다.

- Frontend: Next.js 14 (Vercel)
- Backend: FastAPI + Python 커널 워커 (Render)
- AI: Gemini API (브라우저 직접 호출, 키 서버 미저장)

## 기능

- 셀 단위 Python 실행 (변수 상태 유지)
- Fish / Pokemon 기본 데이터셋 + CSV 업로드 (최대 5MB, UTF-8)
- 4종 알고리즘: KNN, Linear Regression, Logistic Regression, Decision Tree
- 가이드형 / 자유 노트북 모드
- AI 코치 (정답 코드 금지, 힌트 중심)
- 자동 시각화, .ipynb/.py 다운로드

## 빠른 시작 (로컬)

### 1. 사전 요구

- Node.js 20+
- pnpm 9+
- Python 3.11+

### 2. Python 가상환경 (최초 1회)

```bash
cd apps/api
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. 프론트엔드 의존성 (최초 1회)

```bash
cd apps/web && npm install
```

### 4. 개발 서버 (프론트 + 백엔드 동시 실행)

```bash
# 프로젝트 루트
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:8000

개별 실행이 필요하면:

```bash
npm run dev:web   # 프론트만
npm run dev:api   # 백엔드만 (.venv Python 자동 사용)
```

### 5. Docker (통합)

```bash
docker-compose up --build
```

## 환경변수

`.env.example` 참고:

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | 프론트 → API URL | `http://localhost:8000` |
| `WEB_ORIGIN` | CORS 허용 Origin | `http://localhost:3000` |
| `SESSION_TTL_MINUTES` | 세션 TTL | `30` |
| `EXEC_TIMEOUT_SECONDS` | 셀 실행 타임아웃 | `10` |

## Gemini API Key

1. https://aistudio.google.com/apikey 에서 키 발급
2. 최초 접속 화면에서 입력
3. **브라우저 메모리(zustand)에만 저장** — 서버 전송 없음

## 프로젝트 구조

```
apps/web/     Next.js 프론트엔드
apps/api/     FastAPI + Python 워커
data/         원본 CSV (api/data로 복사됨)
classipynb/   교사용 ipynb (api/classipynb로 복사됨)
docs/         배포/아키텍처 문서
```

## 배포

- Frontend: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- Backend: [docs/DEPLOY_RENDER.md](docs/DEPLOY_RENDER.md)

## 보안

- AST 화이트리스트 import 검증
- Linux RLIMIT (CPU/메모리/파일)
- 네트워크/socket 차단
- 세션당 격리 워커 프로세스

자세한 내용: [docs/SECURITY.md](docs/SECURITY.md)

## 라이선스

교육용 프로젝트
