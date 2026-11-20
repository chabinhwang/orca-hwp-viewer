import { sanitizeSvg } from './svg'
import { start, type HwpFile } from './sync'
import { fetchPageSvg, PasswordError, uploadAndRender, type RenderedDoc } from './transport'
import { createView } from './view'

const MAX_PARALLEL_PAGES = 2

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'code' in error) return String((error as { code: unknown }).code)
  return String(error)
}

let generation = 0
let observer: IntersectionObserver | undefined
/** 이 탭에서 문서를 연 비밀번호. 에이전트가 파일을 바꿔 다시 그릴 때 한 번 더 묻지 않으려고 메모리에만 둔다 */
let password: string | undefined

const view = createView()

/** 화면 가까이 온 쪽만 워커에서 받아 그린다 */
function watchPages(doc: RenderedDoc, slots: Map<number, HTMLDivElement>, mine: number): void {
  observer?.disconnect()
  const queue: number[] = []
  const requested = new Set<number>()
  let running = 0

  const pump = () => {
    while (running < MAX_PARALLEL_PAGES && queue.length > 0) {
      const page = queue.shift() as number
      running++
      fetchPageSvg(doc.docId, page)
        .then((svg) => {
          if (mine === generation) view.fillPage(page, sanitizeSvg(svg, `p${page}-`))
        })
        .catch((error: unknown) => {
          if (mine === generation) view.fillPage(page, `${page}쪽을 그리지 못했습니다: ${messageOf(error)}`)
        })
        .finally(() => {
          running--
          pump()
        })
    }
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const page = Number((entry.target as HTMLElement).dataset.page)
        if (!entry.isIntersecting || requested.has(page)) continue
        requested.add(page)
        queue.push(page)
      }
      queue.sort((a, b) => a - b)
      pump()
    },
    { root: view.scroll, rootMargin: '1200px 0px' }
  )
  for (const slot of slots.values()) observer.observe(slot)
}

/** typed: 사용자가 방금 입력한 비밀번호인지 (아니면 기억해 둔 비밀번호이거나 없음) */
async function show(file: HwpFile, attempt: string | undefined = password, typed = false): Promise<void> {
  const mine = ++generation
  if (file.bytes.length === 0) {
    view.showMessage('빈 파일입니다.')
    view.setStatus('')
    return
  }
  view.setStatus('렌더 중…')
  try {
    const started = performance.now()
    const doc = await uploadAndRender(file.bytes, file.fileType, attempt)
    if (mine !== generation) return
    password = attempt
    const slots = view.layout(doc.pages)
    view.fitDefault()
    const seconds = ((performance.now() - started) / 1000).toFixed(1)
    const warn = doc.warnings.length > 0 ? ` · 경고 ${doc.warnings.length}건: ${doc.warnings.join(' / ')}` : ''
    view.setStatus(`${file.fileType.toUpperCase()} · ${doc.pages.length}쪽 · ${seconds}s${warn}`)
    watchPages(doc, slots, mine)
  } catch (error) {
    if (mine !== generation) return
    if (error instanceof PasswordError) {
      password = undefined
      // 기억해 둔 비밀번호가 바뀐 파일에 안 맞으면 틀렸다고 하지 않고 처음처럼 묻는다
      view.askPassword(error.state === 'wrong' && typed, (next) => void show(file, next, true))
      view.setStatus('비밀번호 필요')
      return
    }
    view.showMessage(`문서를 렌더하지 못했습니다.\n\n${messageOf(error)}`, true)
    view.setStatus('실패')
  }
}

try {
  const { session, initial } = await start()
  await show(initial)
  session.onReplace((file) => void show(file))
} catch (error) {
  view.showMessage(`뷰어를 시작하지 못했습니다.\n\n${messageOf(error)}`, true)
}
