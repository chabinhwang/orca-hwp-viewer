// 테스트용 HWPX를 kordoc으로 만들어 test/fixtures/generated/에 둔다 (Git 제외).
// 저장소에 문서 파일(ZIP 기반 HWPX 포함)을 커밋하지 않기 위한 단계다.
import { markdownToHwpx } from 'kordoc'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'generated')

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

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'sample.hwpx'), Buffer.from(await markdownToHwpx(markdown)))
console.log('wrote test/fixtures/generated/sample.hwpx')
