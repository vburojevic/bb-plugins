// Draws the README hero: a line drawing of a bb window with every plugin's
// mark placed where that plugin lives in bb. Monochrome like the icons, theme-
// aware, with one staggered entrance that respects reduced motion.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const W = 1280
const H = 600

// Where each plugin lives, in hero coordinates. Kept beside the drawing so
// the two can't drift apart.
export const SPOTS = {
  'linear':            { x: 520, y: 112, label: 'Linear', anchor: 'start', dx: 30, dy: 5 },
  'xcode':             { x: 92,  y: 394, label: 'Xcode', anchor: 'start', dx: 30, dy: 5 },
  'ayu':               { x: 92,  y: 448, label: 'Ayu', anchor: 'start', dx: 30, dy: 5 },
  'cortado':           { x: 92,  y: 502, label: 'Cortado', anchor: 'start', dx: 30, dy: 5 },
  'iris':              { x: 388, y: 262, label: 'Iris', anchor: 'start', dx: 30, dy: 5 },
  'prompts':           { x: 352, y: 418, label: 'Prompts', anchor: 'start', dx: 30, dy: 5 },
  'prompt-enhancer':   { x: 770, y: 488, label: 'Prompt Enhancer', anchor: 'end', dx: -30, dy: 5 },
  'pets':              { x: 620, y: 432, label: 'Pets', anchor: 'start', dx: 30, dy: 5 },
  'handoff':           { x: 1000, y: 112, label: 'Handoff', anchor: 'start', dx: 30, dy: 5 },
  'floating-notes':    { x: 860, y: 214, label: 'Floating Notes', anchor: 'start', dx: 30, dy: 5 },
  'floating-terminal': { x: 900, y: 402, label: 'Floating Terminal', anchor: 'start', dx: 30, dy: 5 }
}

const PALETTE = {
  light: { ink: '#1f2430', line: '#d0d7de', soft: '#eaeef2', muted: '#59636e', paper: '#ffffff' },
  dark:  { ink: '#c9d1d9', line: '#3d444d', soft: '#262c36', muted: '#9198a1', paper: '#0d1117' }
}

/** Inline a vendored icon as a nested <svg> at (cx, cy), `size` wide. */
function mark (svgText, cx, cy, size) {
  const open = /<svg\b([^>]*)>/i.exec(svgText)
  const viewBox = /viewBox="([^"]+)"/i.exec(open[1])?.[1] ?? '0 0 24 24'
  const keep = (open[1].match(/\s(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/gi) ?? []).join('')
  const body = svgText.slice(open.index + open[0].length, svgText.lastIndexOf('</svg>'))
    .replace(/<!--[\s\S]*?-->/g, '')
  const h = size / 2
  return `<svg x="${cx - h}" y="${cy - h}" width="${size}" height="${size}" viewBox="${viewBox}"${keep}>${body}</svg>`
}

export async function hero (iconsDir, ids, theme) {
  const c = PALETTE[theme]
  const font = `ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`
  const marks = []
  let i = 0
  for (const id of ids) {
    const s = SPOTS[id]
    if (!s) continue
    const icon = await readFile(join(iconsDir, theme === 'dark' ? `${id}-dark.svg` : `${id}.svg`), 'utf8')
    marks.push(`
    <g class="m" style="animation-delay:${(0.35 + i * 0.12).toFixed(2)}s">
      <circle cx="${s.x}" cy="${s.y}" r="21" fill="${c.paper}" stroke="${c.ink}" stroke-width="1.5"/>
      ${mark(icon, s.x, s.y, 22)}
      <text x="${s.x + s.dx}" y="${s.y + s.dy}" text-anchor="${s.anchor}" font-size="15" font-weight="600" fill="${c.ink}">${s.label}</text>
    </g>`)
    i++
  }

  const bar = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${c.soft}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${font}" role="img" aria-label="A bb window with each plugin shown where it lives in bb">
  <style>
    .m { animation: in .5s cubic-bezier(.2,.7,.2,1) both; transform-box: fill-box; transform-origin: center; }
    @keyframes in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
    @media (prefers-reduced-motion: reduce) { .m { animation: none } }
  </style>

  <!-- window -->
  <rect x="40" y="40" width="1200" height="520" rx="18" fill="none" stroke="${c.line}" stroke-width="2"/>
  <line x1="40" y1="84" x2="1240" y2="84" stroke="${c.line}" stroke-width="2"/>
  <circle cx="68" cy="62" r="6" fill="${c.line}"/><circle cx="90" cy="62" r="6" fill="${c.line}"/><circle cx="112" cy="62" r="6" fill="${c.line}"/>

  <!-- sidebar: threads, then plugin panels at the foot -->
  <line x1="260" y1="84" x2="260" y2="560" stroke="${c.line}" stroke-width="2"/>
  ${bar(68, 112, 150)}${bar(68, 140, 120)}${bar(68, 168, 160)}${bar(68, 196, 100)}${bar(68, 224, 140)}${bar(68, 252, 112)}
  <line x1="60" y1="360" x2="240" y2="360" stroke="${c.line}" stroke-width="2"/>

  <!-- thread header -->
  <line x1="260" y1="140" x2="1240" y2="140" stroke="${c.line}" stroke-width="2"/>
  ${bar(290, 108, 180)}

  <!-- chat: one message, then an Iris card -->
  <rect x="520" y="170" width="280" height="44" rx="12" fill="${c.soft}"/>
  <rect x="360" y="232" width="380" height="132" rx="12" fill="none" stroke="${c.line}" stroke-width="2"/>
  <polyline points="430,340 480,316 530,328 580,292 630,302 680,268 716,280" fill="none" stroke="${c.line}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- composer, with the queue chip above it -->
  <rect x="300" y="452" width="500" height="72" rx="16" fill="none" stroke="${c.ink}" stroke-width="2"/>
  ${bar(326, 484, 210)}
  <rect x="326" y="400" width="190" height="36" rx="18" fill="none" stroke="${c.line}" stroke-width="2"/>

  <!-- side panel -->
  <line x1="960" y1="84" x2="960" y2="560" stroke="${c.line}" stroke-width="2"/>
  ${bar(990, 196, 200)}${bar(990, 224, 160)}${bar(990, 252, 180)}

  <!-- floating windows over the thread -->
  <rect x="824" y="178" width="196" height="150" rx="10" fill="${c.paper}" stroke="${c.ink}" stroke-width="2"/>
  ${bar(848, 250, 140)}${bar(848, 276, 110)}${bar(848, 302, 128)}
  <rect x="864" y="364" width="300" height="168" rx="10" fill="${c.paper}" stroke="${c.ink}" stroke-width="2"/>
  <text x="888" y="460" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="16" fill="${c.muted}">$ npm test</text>
  <text x="888" y="488" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="16" fill="${c.muted}">✓ 146 passed</text>
${marks.join('')}
</svg>
`
}
