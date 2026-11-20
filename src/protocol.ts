/** 에디터 화면과 워커가 함께 쓰는 요청 계약. 요청·응답은 JSON(응답 1 MiB 한도)이라
 *  파일은 base64 조각으로 올리고, 쪽 SVG는 글자 범위로 나눠 받는다. */

/** 에디터 화면 → 워커 메시지 한도는 문서에 없고 CLI 경로보다 작다. 이 크기로 시작해
 *  `too large`가 나면 절반씩 줄인다 (editor/transport.ts) */
export const UPLOAD_CHUNK_CHARS = 48_000
/** 한 번에 받는 SVG 글자 수의 시작값이자 워커가 허용하는 최대값 (한글은 JSON에서 3바이트) */
export const PAGE_SLICE_CHARS = 48_000
/** 조각을 이보다 작게 줄여도 안 되면 포기한다 */
export const MIN_CHUNK_CHARS = 2_000

export type PageInfo = { page: number; width: number; height: number; length: number }

/** 암호 문서: `required`는 비밀번호가 필요, `wrong`은 넘긴 비밀번호가 틀림 */
export type PasswordState = 'required' | 'wrong'

/** 비밀번호 길이 상한. 한컴오피스 열기 암호보다 넉넉하다 */
export const MAX_PASSWORD_LENGTH = 256

export type RenderResult =
  | { ok: true; docId: string; pages: PageInfo[]; warnings: string[] }
  | { ok: false; error: string; password?: PasswordState }

export type SliceResult = { ok: true; text: string; done: boolean } | { ok: false; error: string }

declare module 'orca' {
  interface PluginRequests {
    'hwp.chunk': {
      input: { uploadId: string; index: number; total: number; data: string }
      output: { received: number }
    }
    'hwp.render': { input: { uploadId: string; fileType: string; password?: string }; output: RenderResult }
    'hwp.page': { input: { docId: string; page: number; offset: number; max?: number }; output: SliceResult }
  }
}
