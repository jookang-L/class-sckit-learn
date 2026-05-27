# Render 배포 (Backend)

## 1. Render 계정

https://render.com 가입 (GitHub 연동 권장)

## 2. Web Service 생성

1. New → Web Service
2. GitHub 레포 연결
3. 설정:
   - **Name**: `sckit-learn-api`
   - **Root Directory**: `apps/api`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`

또는 `render.yaml` Blueprint 사용:

```bash
# Render Dashboard → Blueprints → New Blueprint Instance
# render.yaml 경로: apps/api/render.yaml
```

## 3. 환경변수

| Key | Value |
|-----|-------|
| `WEB_ORIGIN` | `https://your-app.vercel.app` |
| `SESSION_TTL_MINUTES` | `30` |
| `EXEC_TIMEOUT_SECONDS` | `5` |
| `MAX_UPLOAD_BYTES` | `5242880` |
| `MAX_ACTIVE_WORKERS` | `18` |
| `MAX_CONCURRENT_EXECUTIONS` | `6` |

## 4. Health Check

- Path: `/health`
- Render가 자동으로 헬스체크

## 5. 무료 플랜 주의

- 15분 idle 후 sleep → 첫 요청 cold start 30~60초
- 수업 전 API warm-up 권장: `curl https://your-api.onrender.com/health`

## Railway 대체 (간단)

1. https://railway.app → New Project → GitHub
2. Root: `apps/api`
3. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. 환경변수 동일하게 설정

## 로컬 Docker 테스트

```bash
cd apps/api
docker build -t sckit-api .
docker run -p 8000:8000 -e WEB_ORIGIN=http://localhost:3000 sckit-api
```
