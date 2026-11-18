import { assert, mockEditorHost, test } from 'orca/testing'
import { detectType, start } from './sync'

test('파일 형식을 확장자 힌트 또는 첫 바이트로 판별한다', () => {
  assert.equal(detectType(new Uint8Array([0xd0, 0xcf, 0x11]), ''), 'hwp')
  assert.equal(detectType(new Uint8Array([0x50, 0x4b, 0x03]), ''), 'hwpx')
  assert.equal(detectType(new Uint8Array([0x00]), '.HWPX'), 'hwpx')
  assert.equal(detectType(new Uint8Array([0x00]), ''), 'unknown')
})

test('열린 바이트 문서를 그대로 받는다', async () => {
  const host = mockEditorHost({ bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]) })
  const { session, initial } = await start()
  assert.deepEqual([...initial.bytes], [0x50, 0x4b, 0x03, 0x04])
  assert.equal(initial.fileType, 'hwpx')
  session.dispose()
  host.dispose()
})
