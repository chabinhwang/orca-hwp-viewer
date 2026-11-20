# 개발

```sh
npm install
npm run build          # dist/worker.mjs, dist/worker.d.mts, THIRD_PARTY_NOTICES.txt
npm run typecheck
npm test               # 번들이 최신인지 확인 → 테스트 HWPX 생성 → orca plugin test
orca plugin check .
orca plugin dev watch .    # Orca에 개발 플러그인으로 올리고 로그와 리로드를 보여 줌 (승인 필요)
orca plugin shot local.hwp-viewer --editor "$PWD/test/fixtures/generated/sample.hwpx" --out shot.png
```

- 워커 코드나 kordoc 버전을 바꿨다면 `npm run build` 결과(`dist/`, `THIRD_PARTY_NOTICES.txt`)도 같이 커밋해야 합니다. 번들이 소스와 다르면 `npm test`가 실패합니다.
- 저장소에는 실제 한글 문서를 넣지 않습니다. 진짜 HWP 5.x 파일로 확인하고 싶으면 `test/fixtures/local/`에 넣어 두세요(Git에는 안 올라갑니다). `npm test`가 그 폴더 안 문서를 전부 렌더해 봅니다.
