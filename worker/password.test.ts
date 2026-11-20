import { assert, test } from 'orca/testing'
import { passwordOption, passwordState } from './password'

test('kordoc 오류 문구로 비밀번호 상태를 가른다', () => {
  assert.equal(passwordState('암호로 보호된 HWP 문서입니다. password 옵션에 열기 암호를 지정하세요.'), 'required')
  assert.equal(passwordState('암호로 보호된 HWPX 파일입니다. password 옵션에 열기 암호를 지정하세요.'), 'required')
  assert.equal(passwordState('비밀번호가 일치하지 않거나 암호화 데이터가 손상되었습니다.'), 'wrong')
  // 비밀번호로 풀 수 없는 문서는 입력창을 띄우지 않는다
  assert.equal(passwordState('배포용으로 암호화된 HWPX 파일입니다 (배포용 복호는 지원하지 않음). 한컴오피스에서 일반 문서로 저장한 뒤 여세요.'), undefined)
  assert.equal(passwordState('DRM 보호된 HWP는 지원하지 않습니다'), undefined)
})

test('빈 비밀번호와 문자열이 아닌 값은 비밀번호 없음으로 본다', () => {
  assert.equal(passwordOption(''), undefined)
  assert.equal(passwordOption(undefined), undefined)
  assert.equal(passwordOption(1234), undefined)
  assert.equal(passwordOption('abc'), 'abc')
})
