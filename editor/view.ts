import type { PageInfo } from '../src/protocol.ts'

const PT_TO_PX = 96 / 72
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]
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

export function createView(handlers: { onZoom: (zoom: number) => void; onFit: () => void }) {
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
    const next =
      direction > 0 ? ZOOM_STEPS.find((z) => z > zoom + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001)
    if (next) handlers.onZoom(next)
  }
  bar.append(
    button('−', '축소', () => step(-1)),
    zoomLabel,
    button('+', '확대', () => step(1)),
    button('폭 맞춤', '창 폭에 맞추기', handlers.onFit),
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
    setZoom(next: number) {
      const anchor = scroll.scrollTop / Math.max(1, scroll.scrollHeight)
      zoom = Math.min(ZOOM_STEPS[ZOOM_STEPS.length - 1], Math.max(ZOOM_STEPS[0], next))
      sizeSlots()
      scroll.scrollTop = anchor * scroll.scrollHeight
    },
    /** 가장 넓은 쪽이 창 폭에 들어가는 배율 */
    fitZoom(): number {
      const widest = Math.max(1, ...pages.map((info) => info.width * PT_TO_PX))
      return Math.min(2, Math.max(ZOOM_STEPS[0], (scroll.clientWidth - 40) / widest))
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
