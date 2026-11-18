/** 올라오는 파일 조각과 렌더된 문서를 워커 메모리에 잠시 둔다 */

const MAX_UPLOADS = 4
const MAX_DOCS = 6
const MAX_UPLOAD_BYTES = 64 * 1024 * 1024

type Upload = { total: number; parts: (string | undefined)[]; received: number }
export type RenderedDoc = { pages: Map<number, string> }

/** 가장 오래 안 쓴 항목부터 버리는 작은 Map */
function evict<V>(map: Map<string, V>, max: number): void {
  while (map.size > max) {
    const oldest = map.keys().next().value
    if (oldest === undefined) return
    map.delete(oldest)
  }
}

export class DocStore {
  private uploads = new Map<string, Upload>()
  private docs = new Map<string, RenderedDoc>()

  addChunk(uploadId: string, index: number, total: number, data: string): number {
    if (!uploadId || !Number.isInteger(total) || total < 1 || total > 50_000) {
      throw new Error('잘못된 업로드 조각입니다')
    }
    if (!Number.isInteger(index) || index < 0 || index >= total) {
      throw new Error(`조각 번호가 범위를 벗어났습니다: ${index}/${total}`)
    }
    let upload = this.uploads.get(uploadId)
    if (!upload || upload.total !== total) {
      upload = { total, parts: new Array(total), received: 0 }
      this.uploads.set(uploadId, upload)
      evict(this.uploads, MAX_UPLOADS)
    }
    if (upload.parts[index] === undefined) upload.received++
    upload.parts[index] = data
    return upload.received
  }

  /** 다 모인 조각을 바이트로 합치고 업로드 기록은 지운다 */
  takeBytes(uploadId: string): Uint8Array {
    const upload = this.uploads.get(uploadId)
    this.uploads.delete(uploadId)
    if (!upload) throw new Error('업로드를 찾지 못했습니다. 파일을 다시 열어 주세요.')
    if (upload.received !== upload.total) {
      throw new Error(`파일 조각이 덜 왔습니다: ${upload.received}/${upload.total}`)
    }
    const bytes = Buffer.from(upload.parts.join(''), 'base64')
    if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) {
      throw new Error(`파일 크기를 처리할 수 없습니다: ${bytes.length} bytes`)
    }
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length)
  }

  putDoc(docId: string, doc: RenderedDoc): void {
    this.docs.set(docId, doc)
    evict(this.docs, MAX_DOCS)
  }

  getDoc(docId: string): RenderedDoc | undefined {
    const doc = this.docs.get(docId)
    if (doc) {
      this.docs.delete(docId)
      this.docs.set(docId, doc)
    }
    return doc
  }
}
