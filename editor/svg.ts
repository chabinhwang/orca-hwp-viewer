/** kordoc SVG를 화면에 넣기 전에 실행될 수 있는 요소·속성을 걷어내고, 쪽끼리 겹치는 id에 접두어를 붙인다.
 *  (kordoc은 쪽마다 `#bin0` 같은 같은 id를 쓰므로 한 화면에 여러 쪽을 두면 참조가 엇갈린다) */

const BLOCKED_TAGS = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed'])
const SAFE_HREF = /^(#|data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);)/i
const URL_REF = /url\(\s*#([^)\s]+)\s*\)/g

function cleanElement(element: Element, rename: (id: string) => string | undefined): void {
  for (const attr of [...element.attributes]) {
    const name = attr.name.toLowerCase()
    const value = attr.value.trim()
    if (name.startsWith('on')) {
      element.removeAttribute(attr.name)
    } else if (name === 'href' || name === 'xlink:href') {
      if (!SAFE_HREF.test(value)) element.removeAttribute(attr.name)
      else if (value.startsWith('#')) attr.value = `#${rename(value.slice(1)) ?? value.slice(1)}`
    } else if (name === 'id') {
      attr.value = rename(value) ?? value
    } else if (value.includes('url(')) {
      attr.value = value.replace(URL_REF, (whole, id: string) => {
        const next = rename(id)
        return next ? `url(#${next})` : whole
      })
    }
  }
}

export function sanitizeSvg(markup: string, idPrefix: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.nodeName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
    throw new Error('쪽 SVG를 읽지 못했습니다')
  }
  const all = [root, ...root.querySelectorAll('*')]
  const ids = new Set(all.map((element) => element.getAttribute('id')).filter((id): id is string => !!id))
  const rename = (id: string) => (ids.has(id) ? `${idPrefix}${id}` : undefined)
  for (const element of all) {
    if (BLOCKED_TAGS.has(element.localName.toLowerCase())) element.remove()
    else cleanElement(element, rename)
  }
  return document.importNode(root, true) as unknown as SVGSVGElement
}
