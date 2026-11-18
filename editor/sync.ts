/** Orca와 문서를 주고받는 유일한 코드. 뷰어라서 편집은 보내지 않고, 바깥에서 파일이 바뀌면 다시 받는다. */

export type HwpFile = { bytes: Uint8Array; fileType: string }

const EMPTY: HwpFile = { bytes: new Uint8Array(0), fileType: '' }

/** fileType이 비어 있으면 첫 바이트로 판별한다: HWP5는 OLE(D0 CF), HWPX는 ZIP(PK) */
export function detectType(bytes: Uint8Array, hint?: string): string {
  if (hint) return hint.replace(/^\./, '').toLowerCase()
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return 'hwp'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'hwpx'
  return 'unknown'
}

export async function start() {
  const document = orca.document
  if (!document) throw new Error('이 파일은 커스텀 에디터로만 실행됩니다')
  let fileType = ''
  const session = await document.session<HwpFile>({
    decode: (content) => {
      if (content.kind !== 'bytes') return EMPTY
      const bytes = new Uint8Array(content.bytes)
      return { bytes, fileType: detectType(bytes, fileType) }
    },
    encode: (value) => ({ kind: 'bytes', bytes: value.bytes.slice().buffer })
  })
  const latest = await document.get()
  fileType = latest.fileType ?? ''
  const first = session.value
  return { session, initial: { bytes: first.bytes, fileType: detectType(first.bytes, fileType) } }
}
