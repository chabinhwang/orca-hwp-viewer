import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { assert, mountWorker, test } from 'orca/testing'
import * as bundle from '../dist/worker.mjs'
import { PAGE_SLICE_CHARS, UPLOAD_CHUNK_CHARS } from '../src/protocol.ts'

// 배포되는 번들(dist/worker.mjs)을 시험한다. Orca는 .ts 소스의 npm import를 허용하지 않으므로
// kordoc을 묶은 번들이 곧 실제 워커다. `npm test`가 번들 최신 여부 확인과 테스트 문서 생성을 먼저 한다.
const ROOT = join(import.meta.dirname, '..')
const SAMPLE = join(ROOT, 'test', 'fixtures', 'generated', 'sample.hwpx')
// HWP 5.x는 만들 방법이 없어 test/fixtures/local/(Git 제외)에 실제 문서가 있을 때만 확인한다
const LOCAL_DIR = join(ROOT, 'test', 'fixtures', 'local')
const localDocs = existsSync(LOCAL_DIR) ? readdirSync(LOCAL_DIR).filter((name) => /\.hwpx?$/i.test(name)) : []

type WorkerModule = Parameters<typeof mountWorker>[0]
type Mounted = Awaited<ReturnType<typeof mountWorker>>

const loadWorker = async () => bundle as WorkerModule

async function render(bytes: Uint8Array, fileType: string) {
  const mounted = await mountWorker(await loadWorker())
  const base64 = Buffer.from(bytes).toString('base64')
  const total = Math.ceil(base64.length / UPLOAD_CHUNK_CHARS)
  for (let index = 0; index < total; index++) {
    const data = base64.slice(index * UPLOAD_CHUNK_CHARS, (index + 1) * UPLOAD_CHUNK_CHARS)
    await mounted.request('hwp.chunk', { uploadId: 'u1', index, total, data })
  }
  return { mounted, result: await mounted.request('hwp.render', { uploadId: 'u1', fileType }) }
}

async function readPage(mounted: Mounted, docId: string, page: number, max?: number) {
  let svg = ''
  let calls = 0
  for (;;) {
    const slice = await mounted.request('hwp.page', { docId, page, offset: svg.length, max })
    assert.ok(slice.ok, slice.ok ? '' : slice.error)
    if (!slice.ok) return { svg, calls }
    assert.ok(slice.text.length <= PAGE_SLICE_CHARS)
    calls++
    svg += slice.text
    if (slice.done) return { svg, calls }
  }
}

const sample = () => new Uint8Array(readFileSync(SAMPLE))

test('HWPX를 쪽 SVG로 렌더하고 나눠 돌려준다', async () => {
  const { mounted, result } = await render(sample(), 'hwpx')
  assert.ok(result.ok, result.ok ? '' : result.error)
  if (!result.ok) return
  assert.ok(result.pages.length >= 2, `쪽 수 ${result.pages.length}`)
  const first = result.pages[0]
  const { svg } = await readPage(mounted, result.docId, first.page)
  assert.equal(svg.length, first.length)
  assert.ok(svg.startsWith('<svg'))
  assert.ok(svg.includes('뷰어'))
})

test('작은 max로 요청하면 쪽 SVG를 여러 조각으로 나눠 준다', async () => {
  const { mounted, result } = await render(sample(), 'hwpx')
  assert.ok(result.ok)
  if (!result.ok) return
  const first = result.pages[0]
  const { svg, calls } = await readPage(mounted, result.docId, first.page, 2_000)
  assert.equal(svg.length, first.length)
  assert.equal(calls, Math.ceil(first.length / 2_000))
})

for (const name of localDocs) {
  test(`로컬 문서 ${name}의 모든 쪽을 렌더한다`, async () => {
    const { mounted, result } = await render(new Uint8Array(readFileSync(join(LOCAL_DIR, name))), name.split('.').pop() ?? '')
    assert.ok(result.ok, result.ok ? '' : result.error)
    if (!result.ok) return
    for (const info of result.pages) {
      const { svg } = await readPage(mounted, result.docId, info.page)
      assert.equal(svg.length, info.length)
    }
  })
}

test('깨진 파일은 오류 문구로 답한다', async () => {
  const mounted = await mountWorker(await loadWorker())
  await mounted.request('hwp.chunk', { uploadId: 'bad', index: 0, total: 1, data: Buffer.from('not a hwp').toString('base64') })
  const result = await mounted.request('hwp.render', { uploadId: 'bad', fileType: 'hwp' })
  assert.equal(result.ok, false)
})

test('모르는 문서 쪽은 만료 오류로 답한다', async () => {
  const mounted = await mountWorker(await loadWorker())
  const slice = await mounted.request('hwp.page', { docId: 'nope', page: 1, offset: 0 })
  assert.equal(slice.ok, false)
})
