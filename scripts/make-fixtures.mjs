// 테스트용 HWPX를 kordoc으로 만들어 test/fixtures/generated/에 둔다 (Git 제외).
// 저장소에 문서 파일(ZIP 기반 HWPX 포함)을 커밋하지 않기 위한 단계다.
import JSZip from 'jszip'
import { markdownToHwpx } from 'kordoc'
import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'generated')

/** 암호 문서 테스트용 비밀번호. worker/main.test.ts와 같아야 한다 */
const ENCRYPTED_PASSWORD = 'orca-test-1234'
/** 암호화할 본문 파일. 한컴오피스처럼 Contents의 XML을 잠근다 */
const ENCRYPTED_PATHS = ['Contents/header.xml', 'Contents/section0.xml']
const PBKDF2_ITERATIONS = 1024

const markdown = [
  '# HWP 뷰어 테스트',
  '',
  '테스트용 문서입니다.',
  '',
  '| 항목 | 값 |',
  '|---|---|',
  '| 형식 | HWPX |',
  '| 목적 | 렌더 확인 |',
  '',
  ...Array.from({ length: 80 }, (_, i) => `${i + 1}. 쪽을 넘기기 위한 ${i + 1}번째 문단입니다.`)
].join('\n')

const lockedMarkdown = ['# 암호 문서 테스트', '', `비밀번호는 ${ENCRYPTED_PASSWORD} 입니다.`].join('\n')

/** 한 파일을 HWPX(ODF 방식) 열기 암호로 잠근다: SHA-256(비밀번호) → PBKDF2 → AES-256-CBC, 본문은 deflate 후 암호화.
 *  kordoc의 decryptHwpxInPlace가 푸는 순서를 거꾸로 따른다. */
function encryptEntry(path, plain, password) {
  const startKey = createHash('sha256').update(Buffer.from(password, 'utf8')).digest()
  const salt = randomBytes(16)
  const iv = randomBytes(16)
  const key = pbkdf2Sync(startKey, salt, PBKDF2_ITERATIONS, 32, 'sha1')
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const data = Buffer.concat([cipher.update(deflateRawSync(plain)), cipher.final()])
  const checksum = createHash('sha256').update(plain.subarray(0, 1024)).digest()
  const entry = [
    `<odf:file-entry odf:full-path="${path}" odf:media-type="application/xml" odf:size="${plain.length}">`,
    `<odf:encryption-data odf:checksum-type="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0#sha256-1k" odf:checksum="${checksum.toString('base64')}">`,
    `<odf:algorithm odf:algorithm-name="http://www.w3.org/2001/04/xmlenc#aes256-cbc" odf:initialisation-vector="${iv.toString('base64')}"/>`,
    '<odf:start-key-generation odf:start-key-generation-name="http://www.w3.org/2000/09/xmldsig#sha256" odf:key-size="32"/>',
    `<odf:key-derivation odf:key-derivation-name="PBKDF2" odf:key-size="32" odf:iteration-count="${PBKDF2_ITERATIONS}" odf:salt="${salt.toString('base64')}"/>`,
    '</odf:encryption-data></odf:file-entry>'
  ].join('')
  return { data, entry }
}

async function lockHwpx(hwpx, password) {
  const zip = await JSZip.loadAsync(hwpx)
  const entries = []
  for (const path of ENCRYPTED_PATHS) {
    const file = zip.file(path)
    if (!file) throw new Error(`HWPX에 ${path}가 없습니다`)
    const { data, entry } = encryptEntry(path, await file.async('nodebuffer'), password)
    zip.file(path, data, { compression: 'STORE' })
    entries.push(entry)
  }
  const manifest = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">',
    ...entries,
    '</odf:manifest>'
  ].join('')
  zip.file('META-INF/manifest.xml', manifest)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'sample.hwpx'), Buffer.from(await markdownToHwpx(markdown)))
console.log('wrote test/fixtures/generated/sample.hwpx')
writeFileSync(join(out, 'locked.hwpx'), await lockHwpx(Buffer.from(await markdownToHwpx(lockedMarkdown)), ENCRYPTED_PASSWORD))
console.log(`wrote test/fixtures/generated/locked.hwpx (password: ${ENCRYPTED_PASSWORD})`)
