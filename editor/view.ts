import type { PageInfo } from '../src/protocol.ts'
import { clampZoom, fitHeightZoom, fitWidthZoom, pinchFactor, PT_TO_PX, stepZoom } from './zoom'

const PAGE_GAP_PX = 16

const STYLE = `
:root { color-scheme: light dark; }
html, body { margin: 0; height: 100%; }
body { display: flex; flex-direction: column; background: var(--orca-background); color: var(--orca-foreground);
  font: 12px var(--orca-font-sans, system-ui, sans-serif); }
.bar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--orca-border);
  background: var(--orca-card); color: var(--orca-card-foreground); flex: none; }
.bar button { font: inherit; color: inherit; background: var(--orca-secondary); border: 1px solid var(--orca-border);
  border-radius: var(--orca-radius, 6px); padding: 2px 9px; cursor: pointer; }
.bar button:hover { background: var(--orca-accent); color: var(--orca-accent-foreground); }
.bar .zoom { min-width: 44px; text-align: center; font-variant-numeric: tabular-nums; }
.bar .status { margin-left: auto; color: var(--orca-muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.scroll { flex: 1; overflow: auto; background: var(--orca-muted); }
.pages { display: flex; flex-direction: column; align-items: center; gap: ${PAGE_GAP_PX}px; padding: 20px 16px; width: max-content; min-width: 100%; box-sizing: border-box; }
.page { position: relative; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); flex: none; }
.page > svg { display: block; width: 100%; height: 100%; }
.page .note { position: absolute; inset: 0; display: grid; place-items: center; color: #888; font-size: 13px; padding: 16px; text-align: center; }
.message { margin: 48px auto; max-width: 560px; padding: 16px 18px; border-radius: var(--orca-radius, 6px);
  background: var(--orca-card); border: 1px solid var(--orca-border); line-height: 1.6; white-space: pre-wrap; }
.message.error { border-color: var(--orca-destructive); }
`

export type View = ReturnType<typeof createView>

export function createView() {
  const style = document.createElement('style')
  style.textContent = STYLE
  document.head.append(style)

  const bar = document.createElement('div')
  bar.className = 'bar'
  const button = (label: string, title: string, onClick: () => void) => {
    const el = document.createElement('button')
    el.textContent = label
    el.title = title
    el.addEventListener('click', onClick)
    return el
  }
  const zoomLabel = document.createElement('span')
  zoomLabel.className = 'zoom'
  const status = document.createElement('span')
  status.className = 'status'

  let zoom = 1
  const step = (direction: 1 | -1) => {
    const next = stepZoom(zoom, direction)
    if (next) setZoom(next)
  }
  bar.append(
    button('−', '축소', () => step(-1)),
    zoomLabel,
    button('+', '확대', () => step(1)),
    button('쪽 맞춤', '한 쪽이 창 높이에 들어가게 맞추기', () => setZoom(fitHeightZoom(pages, scroll.clientHeight))),
    button('폭 맞춤', '창 폭에 맞추기', () => setZoom(fitWidthZoom(pages, scroll.clientWidth))),
    status
  )

  const scroll = document.createElement('div')
  scroll.className = 'scroll'
  const pagesEl = document.createElement('div')
  pagesEl.className = 'pages'
  scroll.append(pagesEl)
  document.body.append(bar, scroll)

  let pages: PageInfo[] = []
  const slots = new Map<number, HTMLDivElement>()

  const sizeSlots = () => {
    for (const info of pages) {
      const slot = slots.get(info.page)
      if (!slot) continue
      slot.style.width = `${info.width * PT_TO_PX * zoom}px`
      slot.style.height = `${info.height * PT_TO_PX * zoom}px`
    }
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`
  }

  /** 문서 전체 높이 비율로 스크롤 위치를 유지하며 배율을 바꾼다 (버튼·맞춤) */
  const setZoom = (next: number) => {
    const anchor = scroll.scrollTop / Math.max(1, scroll.scrollHeight)
    zoom = clampZoom(next)
    sizeSlots()
    scroll.scrollTop = anchor * scroll.scrollHeight
  }

  /** 커서 아래의 쪽 위치가 그대로 커서 아래에 남도록 배율을 바꾼다 (핀치) */
  const zoomAt = (next: number, clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.page')
    if (!target) return setZoom(next)
    const before = target.getBoundingClientRect()
    const fx = (clientX - before.left) / Math.max(1, before.width)
    const fy = (clientY - before.top) / Math.max(1, before.height)
    zoom = clampZoom(next)
    sizeSlots()
    const after = target.getBoundingClientRect()
    scroll.scrollLeft += after.left + fx * after.width - clientX
    scroll.scrollTop += after.top + fy * after.height - clientY
  }

  // 트랙패드 핀치는 Chromium에서 ctrlKey가 붙은 wheel 이벤트로 온다 (마우스 Ctrl+휠도 같다).
  // 기본 동작(페이지 확대)을 막아야 하므로 passive가 아니어야 한다. 이벤트를 프레임마다 한 번으로 모은다.
  let pendingFactor = 1
  let pendingPoint = { x: 0, y: 0 }
  let frame = 0
  scroll.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey || pages.length === 0) return
      event.preventDefault()
      pendingFactor *= pinchFactor(event.deltaY, event.deltaMode)
      pendingPoint = { x: event.clientX, y: event.clientY }
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const factor = pendingFactor
        pendingFactor = 1
        zoomAt(zoom * factor, pendingPoint.x, pendingPoint.y)
      })
    },
    { passive: false }
  )

  return {
    scroll,
    get zoom() {
      return zoom
    },
    setStatus(text: string) {
      status.textContent = text
      status.title = text
    },
    /** 문서 대신 안내·오류 문구를 보여준다 */
    showMessage(text: string, isError = false) {
      pages = []
      slots.clear()
      const box = document.createElement('div')
      box.className = isError ? 'message error' : 'message'
      box.textContent = text
      pagesEl.replaceChildren(box)
    },
    /** 쪽 크기만큼 빈 자리를 먼저 깔아 스크롤 위치가 흔들리지 않게 한다 */
    layout(next: PageInfo[]): Map<number, HTMLDivElement> {
      pages = next
      slots.clear()
      pagesEl.replaceChildren(
        ...next.map((info) => {
          const slot = document.createElement('div')
          slot.className = 'page'
          slot.dataset.page = String(info.page)
          const note = document.createElement('div')
          note.className = 'note'
          note.textContent = `${info.page}쪽 불러오는 중…`
          slot.append(note)
          slots.set(info.page, slot)
          return slot
        })
      )
      sizeSlots()
      return slots
    },
    setZoom,
    /** 문서를 처음 열 때의 배율: 한 쪽이 창 높이에 들어가게 */
    fitDefault() {
      setZoom(fitHeightZoom(pages, scroll.clientHeight))
    },
    fillPage(page: number, content: Element | string) {
      const slot = slots.get(page)
      if (!slot) return
      if (typeof content === 'string') {
        const note = document.createElement('div')
        note.className = 'note'
        note.textContent = content
        slot.replaceChildren(note)
      } else {
        slot.replaceChildren(content)
      }
    }
  }
}
