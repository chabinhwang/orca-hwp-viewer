import { assert, test } from 'orca/testing'
import { clampZoom, fitHeightZoom, fitWidthZoom, MAX_ZOOM, MIN_ZOOM, pinchFactor, PT_TO_PX, stepZoom } from './zoom'

// A4: 595 x 842pt
const a4 = { page: 1, width: 595, height: 842, length: 0 }
const landscape = { page: 2, width: 842, height: 595, length: 0 }

test('쪽 맞춤은 가장 긴 쪽의 높이를 창 높이에 맞춘다', () => {
  const zoom = fitHeightZoom([a4, landscape], 900)
  assert.ok(Math.abs(zoom - (900 - 44) / (842 * PT_TO_PX)) < 1e-9)
  assert.ok(842 * PT_TO_PX * zoom <= 900)
})

test('폭 맞춤은 가장 넓은 쪽의 폭을 창 폭에 맞춘다', () => {
  const zoom = fitWidthZoom([a4, landscape], 1000)
  assert.ok(Math.abs(zoom - (1000 - 40) / (842 * PT_TO_PX)) < 1e-9)
})

test('맞춤 배율은 최소 배율과 2배 사이로 자른다', () => {
  assert.equal(fitHeightZoom([a4], 10), MIN_ZOOM)
  assert.equal(fitHeightZoom([a4], 100_000), 2)
  assert.equal(fitWidthZoom([], 100_000), 2)
})

test('핀치로 벌리면 확대, 오므리면 축소하고 큰 휠 이동은 잘라낸다', () => {
  assert.ok(pinchFactor(-5, 0) > 1)
  assert.ok(pinchFactor(5, 0) < 1)
  assert.equal(pinchFactor(0, 0), 1)
  assert.equal(pinchFactor(1000, 0), pinchFactor(50, 0))
  assert.equal(pinchFactor(3, 1), pinchFactor(48, 0))
})

test('배율은 허용 범위를 벗어나지 않는다', () => {
  assert.equal(clampZoom(0.1), MIN_ZOOM)
  assert.equal(clampZoom(10), MAX_ZOOM)
  assert.equal(clampZoom(1.3), 1.3)
})

test('버튼 단계는 현재 배율의 다음 칸으로 간다', () => {
  assert.equal(stepZoom(1, 1), 1.1)
  assert.equal(stepZoom(1.03, -1), 1)
  assert.equal(stepZoom(MAX_ZOOM, 1), undefined)
  assert.equal(stepZoom(MIN_ZOOM, -1), undefined)
})
