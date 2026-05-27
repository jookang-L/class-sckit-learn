# Vercel 배포 (Frontend)

## 1. GitHub에 푸시

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo>
git push -u origin main
```

## 2. Vercel 프로젝트 생성

1. https://vercel.com → New Project
2. GitHub 레포 연결
3. **Root Directory**: `apps/web`
4. Framework Preset: Next.js (자동 감지)

## 3. 환경변수

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-api.onrender.com` |

## 4. Deploy

Deploy 클릭 → 빌드 완료 후 Preview URL 확인

## 5. Render CORS 연동

Render 백엔드 `WEB_ORIGIN`을 Vercel URL로 설정:

```
WEB_ORIGIN=https://your-app.vercel.app
```

## 6. 커스텀 도메인 (선택)

Vercel Dashboard → Domains → 추가

## 트러블�hooting

- **API 연결 실패**: `NEXT_PUBLIC_API_BASE_URL` 확인, Render health `/health` 확인
- **CORS 오류**: Render `WEB_ORIGIN`이 Vercel URL과 정확히 일치하는지 확인
