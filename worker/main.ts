import { createHash } from 'node:crypto'
import type { OrcaWorkerApi } from 'orca/worker'
import { MIN_CHUNK_CHARS, PAGE_SLICE_CHARS, type PageInfo, type RenderResult, type SliceResult } from '../src/protocol.ts'
import { renderDocumentToScene } from './kordoc.ts'
import { DocStore } from './store.ts'

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

function warningText(warning: unknown): string {
  if (typeof warning === 'string') return warning
  if (warning && typeof warning === 'object' && 'message' in warning) return String(warning.message)
  return JSON.stringify(warning)
}

export default function activate(orca: OrcaWorkerApi): void {
  const store = new DocStore()

  orca.panels.handle('hwp.chunk', ({ uploadId, index, total, data }) => ({
    received: store.addChunk(uploadId, index, total, data)
  }))

  orca.panels.handle('hwp.render', async ({ uploadId, fileType }): Promise<RenderResult> => {
    try {
      const bytes = store.takeBytes(uploadId)
      const docId = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
      const started = Date.now()
      const { scene, pageSvgs } = await renderDocumentToScene(bytes, { reflow: true })
      store.putDoc(docId, { pages: pageSvgs })
      const pages: PageInfo[] = scene.pages
        .filter((page) => pageSvgs.has(page.page))
        .map((page) => ({ page: page.page, width: page.width, height: page.height, length: pageSvgs.get(page.page)?.length ?? 0 }))
      orca.log(`rendered ${fileType} ${bytes.length}B → ${pages.length} pages in ${Date.now() - started}ms`)
      return { ok: true, docId, pages, warnings: (scene.warnings ?? []).map(warningText) }
    } catch (error) {
      orca.log(`render failed: ${messageOf(error)}`)
      return { ok: false, error: messageOf(error) }
    }
  })

  orca.panels.handle('hwp.page', ({ docId, page, offset, max }): SliceResult => {
    const svg = store.getDoc(docId)?.pages.get(page)
    if (svg === undefined) return { ok: false, error: '렌더 결과가 만료되었습니다. 파일을 다시 열어 주세요.' }
    const size = Math.min(PAGE_SLICE_CHARS, Math.max(MIN_CHUNK_CHARS, Math.floor(max ?? PAGE_SLICE_CHARS)))
    const text = svg.slice(offset, offset + size)
    return { ok: true, text, done: offset + text.length >= svg.length }
  })
}
