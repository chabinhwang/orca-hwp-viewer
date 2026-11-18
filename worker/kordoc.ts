/** kordoc 렌더러를 이 플러그인에 묶어 쓴다. 배포본은 `npm run build`가 `dist/worker.mjs`로 번들하므로
 *  사용자가 kordoc을 따로 설치할 필요가 없다. 번들 대상은 렌더 경로뿐이고 OCR·PDF용 선택 의존성은 빠진다. */
export { renderDocumentToScene } from 'kordoc'
