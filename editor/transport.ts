import { MIN_CHUNK_CHARS, PAGE_SLICE_CHARS, UPLOAD_CHUNK_CHARS, type PageInfo, type PasswordState } from '../src/protocol.ts'

const RENDER_TIMEOUT_MS = 120_000

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const block = 0x8000
  for (let i = 0; i < bytes.length; i += block) {
    binary += String.fromCharCode(...bytes.subarray(i, i + block))
  }
  return btoa(binary)
}

/** 화면↔워커 메시지 한도에 걸린 오류인지 */
export function isTooLarge(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  return code === 'too_large' || /too\s*large/i.test(String(message ?? ''))
}

/** 메시지 한도에 맞을 때까지 조각 크기를 절반씩 줄여 가며 보낸다. 성공한 크기는 다음 호출에도 쓴다 */
let uploadChars = UPLOAD_CHUNK_CHARS
let sliceChars = PAGE_SLICE_CHARS

async function shrinking<T>(get: () => number, set: (size: number) => void, run: (size: number) => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await run(get())
    } catch (error) {
      const next = Math.floor(get() / 2)
      if (!isTooLarge(error) || next < MIN_CHUNK_CHARS) throw error
      set(next)
    }
  }
}

export type RenderedDoc = { docId: string; pages: PageInfo[]; warnings: string[] }

/** 암호 문서라 비밀번호가 필요하거나, 넘긴 비밀번호가 틀렸을 때 */
export class PasswordError extends Error {
  constructor(
    message: string,
    readonly state: PasswordState
  ) {
    super(message)
    this.name = 'PasswordError'
  }
}

/** 파일을 조각내 워커로 올리고 렌더 결과(쪽 목록)를 받는다 */
export async function uploadAndRender(bytes: Uint8Array, fileType: string, password?: string): Promise<RenderedDoc> {
  const base64 = toBase64(bytes)
  // 조각 크기를 줄이면 새 uploadId로 처음부터 다시 보낸다
  const uploadId = await shrinking(
    () => uploadChars,
    (size) => (uploadChars = size),
    async (size) => {
      const id = crypto.randomUUID()
      const total = Math.max(1, Math.ceil(base64.length / size))
      for (let index = 0; index < total; index++) {
        const data = base64.slice(index * size, (index + 1) * size)
        await orca.plugin.request('hwp.chunk', { uploadId: id, index, total, data })
      }
      return id
    }
  )
  // Orca는 값이 undefined인 키가 있으면 요청을 Invalid input으로 거절하므로, 비밀번호가 있을 때만 키를 넣는다
  const input = password ? { uploadId, fileType, password } : { uploadId, fileType }
  const result = await orca.plugin.request('hwp.render', input, { timeoutMs: RENDER_TIMEOUT_MS })
  if (!result.ok) throw result.password ? new PasswordError(result.error, result.password) : new Error(result.error)
  return { docId: result.docId, pages: result.pages, warnings: result.warnings }
}

/** 쪽 SVG를 응답 한도에 맞춰 나눠 받아 이어 붙인다 */
export async function fetchPageSvg(docId: string, page: number): Promise<string> {
  let svg = ''
  for (;;) {
    const slice = await shrinking(
      () => sliceChars,
      (size) => (sliceChars = size),
      (max) => orca.plugin.request('hwp.page', { docId, page, offset: svg.length, max })
    )
    if (!slice.ok) throw new Error(slice.error)
    svg += slice.text
    if (slice.done || slice.text.length === 0) return svg
  }
}
