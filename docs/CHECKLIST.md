# 수동 테스트 체크리스트

## M1-M4 Backend
- [ ] `GET /health` → 200
- [ ] `POST /sessions` → session_id
- [ ] `POST /sessions/{id}/execute` → 변수 유지 (a=1 다음 셀 print(a))
- [ ] `import os` → SafetyError
- [ ] 5초+ 무한루프 → TimeoutError

## M5-M7 Frontend
- [ ] API Key 게이트 → Gemini ping → /lab
- [ ] 셀 실행 stdout 표시
- [ ] AI 코치 응답 (코드블록 필터)
- [ ] Hint 1/2/Concept 버튼

## M6 Data
- [ ] Fish/Pokemon 프로필
- [ ] CSV 업로드 + UTF-8 한글 컬럼
- [ ] 5MB 초과 거부

## M8-M9 Viz & Guided
- [ ] auto-plot PNG
- [ ] 가이드형 단계 진행률

## M10-M12 Export & Deploy
- [ ] .py / .ipynb 다운로드
- [ ] 교사용 노트북 뷰어
- [ ] docker-compose up
