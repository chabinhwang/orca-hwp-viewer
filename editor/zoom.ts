import type { PageInfo } from '../src/protocol.ts'

export const PT_TO_PX = 96 / 72
export const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]
export const MIN_ZOOM = ZOOM_STEPS[0]
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]
/** 맞춤 배율은 이보다 크게 키우지 않는다 (큰 화면에서 글자가 과하게 커지지 않게) */
const MAX_FIT_ZOOM = 2
/** `.pages`의 안쪽 여백(위아래 20px, 좌우 16px)과 스크롤바 몫 */
const FIT_SLACK_Y_PX = 44
const FIT_SLACK_X_PX = 40
/** 휠 한 번에 반영하는 최대 이동량. 마우스 Ctrl+휠(±100)이 한 번에 너무 크게 바뀌지 않게 자른다 */
const MAX_PINCH_DELTA_PX = 50
/** 이동량 1px당 배율 변화 (지수) */
const PINCH_SENSITIVITY = 0.01
const LINE_HEIGHT_PX = 16
const PAGE_HEIGHT_PX = 800

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

const clampFit = (zoom: number) => Math.min(MAX_FIT_ZOOM, Math.max(MIN_ZOOM, zoom))

/** 가장 긴 쪽이 창 높이에 들어가는 배율 */
export function fitHeightZoom(pages: readonly PageInfo[], viewportHeight: number): number {
  const tallest = Math.max(1, ...pages.map((info) => info.height * PT_TO_PX))
  return clampFit((viewportHeight - FIT_SLACK_Y_PX) / tallest)
}

/** 가장 넓은 쪽이 창 폭에 들어가는 배율 */
export function fitWidthZoom(pages: readonly PageInfo[], viewportWidth: number): number {
  const widest = Math.max(1, ...pages.map((info) => info.width * PT_TO_PX))
  return clampFit((viewportWidth - FIT_SLACK_X_PX) / widest)
}

/** 트랙패드 핀치(Chromium에서는 ctrlKey가 붙은 wheel 이벤트) 한 번의 배율 변화.
 *  deltaY가 음수(벌리기)면 1보다 크다. */
export function pinchFactor(deltaY: number, deltaMode: number): number {
  const unit = deltaMode === 1 ? LINE_HEIGHT_PX : deltaMode === 2 ? PAGE_HEIGHT_PX : 1
  const px = Math.min(MAX_PINCH_DELTA_PX, Math.max(-MAX_PINCH_DELTA_PX, deltaY * unit))
  return Math.exp(-px * PINCH_SENSITIVITY)
}

/** 버튼으로 한 단계 확대·축소할 때의 다음 배율. 끝이면 undefined */
export function stepZoom(zoom: number, direction: 1 | -1): number | undefined {
  return direction > 0
    ? ZOOM_STEPS.find((z) => z > zoom + 0.001)
    : [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001)
}
