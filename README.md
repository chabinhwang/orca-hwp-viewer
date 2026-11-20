# HWP Viewer for Orca

**한국어** | [English](README.en.md)

[Orca](https://orca.dev)에서 한글 파일(`.hwp`, `.hwpx`)을 바로 열어 볼 수 있게 해 주는 플러그인입니다.

![HWP Viewer로 연 HWPX 문서](docs/screenshot.png)

## 기능

- 파일 탐색기에서 `.hwp`나 `.hwpx`를 열면 **HWP Preview** 탭으로 열립니다.
- 표, 테두리, 배경색, 그림, 쪽 나눔이 원본 문서대로 나옵니다.
- 처음에는 한 쪽이 창 높이에 맞춰 보입니다. 
- 트랙패드로 핀치하거나 Ctrl+휠, 툴바 버튼으로 확대/축소할 수 있고, `쪽 맞춤`이나 `폭 맞춤`을 누르면 원래대로 돌아갑니다.
- 에이전트나 다른 프로그램이 파일을 고치면 화면도 자동으로 갱신됩니다.
- 암호 걸린 문서는 열 때 비밀번호를 입력합니다. 비밀번호는 저장하지 않습니다.
- 로컬에서만 작동합니다. 네트워크 요청, 사용 통계 수집 전혀 없습니다.

문서 해석과 렌더링은 [kordoc](https://github.com/chrisryugj/kordoc)(MIT)로 수행합니다. 플러그인 안에 들어 있어서 따로 설치하지 않아도 됩니다.

## 설치

Orca **데스크톱 앱** `1.4.248` 이상에서 동작합니다.

Orca 설정 → Plugins에서 `HWP Viewer`를 검색해 설치하거나, 터미널에서 아래처럼 설치하세요.

```sh
orca plugin install chabinhwang/orca-hwp-viewer
```

### 설치할 때 승인 창이 뜨는 이유

kordoc이 `zlib`, `crypto` 같은 Node.js 모듈을 쓰기 때문에 렌더링을 Orca의 별도 Node 워커에서 돌려야 합니다. 그래서 `trusted-worker` 플러그인이 되고, Orca가 설치 전에 한 번 확인을 받습니다.

워커는 열린 파일 내용을 받아서 쪽마다 SVG로 바꿔 돌려주는 일만 합니다. 그 밖의 권한(capability)은 요청하지 않고, 코드는 전부 이 저장소에 있습니다.

## 아직 안 되는 것

- 머리말, 꼬리말, 각주는 안 보입니다.
- 수식은 `.hwpx`에서 간단한 형태로만 그리고, `.hwp`에서는 표시하지 않습니다.
- OLE 개체(엑셀 표, 차트 등)는 표시하지 않고 툴바에 경고를 띄웁니다.
- HWP 3.x 파일, 배포용 HWPX, DRM이 걸린 문서는 열 수 없습니다.
- 문서에 쓰인 글꼴(함초롬바탕 등)이 컴퓨터에 없으면 비슷한 글꼴로 바뀌어 보입니다.
- 편집 기능은 아직 지원하지 않습니다.

이상하게 나오는 문서가 있으면 [이슈](https://github.com/chabinhwang/orca-hwp-viewer/issues)로 알려 주세요. 파일을 올릴 때는 개인정보를 지운 사본으로 부탁드립니다.

## 코드 구조

| 경로 | 내용 |
|---|---|
| `orca-plugin.json` | 매니페스트. `trusted-worker`, 커스텀 에디터 `hwp`(`contentKind: bytes`, `frame: isolated`) |
| `src/protocol.ts` | 에디터와 워커가 주고받는 요청(`hwp.chunk`, `hwp.render`, `hwp.page`)과 조각 크기 |
| `worker/` | 워커 소스. 받은 조각을 합쳐 kordoc `renderDocumentToScene`으로 쪽별 SVG를 만들고 캐시해 둠. 암호 문서 판별(`password.ts`) |
| `dist/worker.mjs` | `npm run build`로 만든 워커 번들(워커 소스 + kordoc 렌더 경로). Orca가 실제로 실행하는 파일 |
| `editor/` | 격리 프레임 뷰어. 업로드와 지연 로드(`main.ts`), 전송(`transport.ts`), SVG 정리(`svg.ts`), 툴바와 핀치 확대(`view.ts`), 배율 계산(`zoom.ts`) |
| `scripts/build.mjs` | 번들과 `THIRD_PARTY_NOTICES.txt` 생성. `--check`를 붙이면 커밋된 번들이 소스와 같은지만 확인 |
| `scripts/make-fixtures.mjs` | 테스트용 HWPX와 열기 암호를 건 HWPX(`locked.hwpx`)를 생성 |

## 라이선스

[MIT](LICENSE). `dist/worker.mjs`에 들어 있는 kordoc과 그 의존성의 라이선스는 [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)에 모아 두었습니다.
