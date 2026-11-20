import { MAX_PASSWORD_LENGTH, type PasswordState } from '../src/protocol.ts'

/** kordoc이 암호 문서에서 내는 오류 문구로 비밀번호 상태를 가른다.
 *  - 비밀번호 없음: "암호로 보호된 HWP 문서입니다. password 옵션에 열기 암호를 지정하세요." (HWPX도 같은 꼴)
 *  - 틀린 비밀번호: "비밀번호가 일치하지 않거나 암호화 데이터가 손상되었습니다."
 *  배포용 HWPX("배포용으로 암호화된…")·DRM 문서는 비밀번호로 열 수 없으므로 여기에 넣지 않는다. */
export function passwordState(message: string): PasswordState | undefined {
  if (/password 옵션/.test(message)) return 'required'
  if (/비밀번호가 일치하지 않/.test(message)) return 'wrong'
  return undefined
}

/** 화면에서 온 비밀번호를 kordoc 옵션으로 쓸 수 있는지 거른다. 빈 값은 비밀번호 없음으로 본다 */
export function passwordOption(password: unknown): string | undefined {
  if (typeof password !== 'string' || password.length === 0) return undefined
  if (password.length > MAX_PASSWORD_LENGTH) throw new Error(`비밀번호가 너무 깁니다 (최대 ${MAX_PASSWORD_LENGTH}자)`)
  return password
}
