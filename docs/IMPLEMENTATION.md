# 구현 메모

코드만 봐서는 이유를 알기 어려운 결정들입니다.

- 에디터 프레임에서 워커로 보낼 수 있는 메시지 크기는 문서에 안 나와 있고, CLI(`orca plugin dev request`)로 보낼 때보다 작습니다. 그래서 파일은 base64 48,000자씩 잘라 올리고, 쪽 SVG도 같은 크기로 나눠 받습니다. 그래도 `too large`가 나면 조각을 반으로 줄여 다시 보냅니다. (`src/protocol.ts`, `editor/transport.ts`)
- kordoc은 모든 쪽에 `#bin0`, `pgclip1` 같은 같은 id를 씁니다. 여러 쪽을 한 화면에 띄우면 그림이 엉뚱한 쪽 것으로 바뀌어서, 쪽마다 `p<쪽>-`를 앞에 붙였습니다. 이때 `script`, `foreignObject`, 이벤트 속성, 외부 링크도 같이 지웁니다. (`editor/svg.ts`)
- Orca는 `.ts` 소스에서 npm 패키지를 import하지 못하게 막습니다. 그래서 워커는 번들로 내보내고, 테스트도 번들을 대상으로 돌립니다. (`scripts/build.mjs`)
