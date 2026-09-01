#!/usr/bin/env node
/**
 * Regenerates README.md from the BB Community marketplace.
 *
 * Source of truth is https://getbb.app/marketplace/v1/marketplace.json — the same
 * catalog BB itself reads. This script filters it down to entries authored by
 * OWNER, vendors their icons into ./icons, and rewrites README.md.
 *
 * Run it by hand:  npm run build
 * There is no CI, no cron and no token. Nothing here runs on its own.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const OWNER = 'vburojevic'
const AUTHOR = 'Vedran Burojević'
const MARKETPLACE = 'https://getbb.app/marketplace/v1/marketplace.json'
const HUB = `https://github.com/${OWNER}/bb-plugins`

// ---------------------------------------------------------------- fetching

async function fetchJson (url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.json()
}

// ------------------------------------------------------------------ semver

/** Parse `^X.Y.Z` into an inclusive-min / exclusive-max pair, npm-style. */
function caretRange (range) {
  const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range?.trim() ?? '')
  if (!m) return null
  const [major, minor, patch] = m.slice(1).map(Number)
  // Below 1.0.0 the caret only admits patches: ^0.3.0 is >=0.3.0 <0.4.0.
  const max = major > 0 ? [major + 1, 0, 0] : [0, minor + 1, 0]
  return { min: [major, minor, patch], max }
}

function parseVersion (tag) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(tag?.trim() ?? '')
  return m ? m.slice(1).map(Number) : null
}

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

function satisfies (version, range) {
  const r = caretRange(range)
  if (!r || !version) return null // unknown shape — caller reports it as unchecked
  return cmp(version, r.min) >= 0 && cmp(version, r.max) < 0
}

// ------------------------------------------------------------------ helpers

/** `https://github.com/vburojevic/bb-plugin-ayu.git` -> `vburojevic/bb-plugin-ayu` */
function repoSlug (entry) {
  const url = entry.source?.git?.url
  if (!url) return null
  const m = /github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/.exec(url)
  return m ? `${m[1]}/${m[2]}` : null
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// -------------------------------------------------------------------- main

async function main () {
  let catalog
  try {
    catalog = await fetchJson(MARKETPLACE)
  } catch (err) {
    // A CDN blip must never be allowed to publish a shrunken or empty index.
    console.error(`\n✗ could not read the marketplace: ${err.message}`)
    console.error('  Nothing was written. Re-run when getbb.app is reachable.\n')
    process.exit(1)
  }

  const mine = (catalog.plugins ?? []).filter((p) => p.author?.github === OWNER)
  if (mine.length === 0) {
    console.error('\n✗ the marketplace returned 0 entries authored by ' + OWNER + '.')
    console.error('  That is almost certainly upstream breakage, not you unlisting 8 plugins.')
    console.error('  Nothing was written.\n')
    process.exit(1)
  }

  const order = JSON.parse(await readFile(join(ROOT, 'plugins.order.json'), 'utf8'))
  const byId = new Map(mine.map((p) => [p.id, p]))

  const missing = order.filter((id) => !byId.has(id))
  if (missing.length) console.warn(`!  in plugins.order.json but not on the marketplace: ${missing.join(', ')}`)

  const extra = mine.map((p) => p.id).filter((id) => !order.includes(id)).sort()
  if (extra.length) console.warn(`!  on the marketplace but not ordered, appended: ${extra.join(', ')}`)

  const plugins = [...order.filter((id) => byId.has(id)), ...extra].map((id) => byId.get(id))

  // ---- vendor the icons (GitHub's camo proxy will not render remote SVGs)
  await mkdir(join(ROOT, 'icons'), { recursive: true })
  for (const p of plugins) {
    const src = p.icon?.url
    if (!src) { console.warn(`!  ${p.id} has no icon`); continue }
    const res = await fetch(new URL(src, MARKETPLACE))
    if (!res.ok) throw new Error(`icon for ${p.id} -> HTTP ${res.status}`)
    await writeFile(join(ROOT, 'icons', `${p.id}.svg`), Buffer.from(await res.arrayBuffer()))
  }

  // ---- stranded-version check
  //
  // Below 1.0.0 a caret range only admits patches, so tagging a new *minor*
  // silently puts your release out of range: everyone who installed from BB's
  // store just stops receiving updates, with no error anywhere. This is the
  // only place that failure mode is ever visible, so it prints on every build.
  console.log('')
  for (const p of plugins) {
    const slug = repoSlug(p)
    const range = p.source?.git?.range
    if (!slug || !range) { console.log(`·  ${p.id.padEnd(18)} not a git source — skipped`); continue }
    let tags
    try {
      tags = await fetchJson(`https://api.github.com/repos/${slug}/tags?per_page=10`)
    } catch {
      console.log(`·  ${p.id.padEnd(18)} could not read tags (rate limit?) — unchecked`)
      continue
    }
    const latest = tags.map((t) => parseVersion(t.name)).filter(Boolean).sort(cmp).at(-1)
    if (!latest) { console.log(`·  ${p.id.padEnd(18)} no version tags — unchecked`); continue }
    const v = `v${latest.join('.')}`
    const ok = satisfies(latest, range)
    if (ok === null) console.log(`·  ${p.id.padEnd(18)} range ${range} is not a caret — unchecked`)
    else if (ok) console.log(`✓  ${p.id.padEnd(18)} ${v} is inside ${range}`)
    else {
      console.log(`⚠  ${p.id.padEnd(18)} latest tag ${v} is OUTSIDE marketplace range ${range}`)
      console.log(`   ${' '.repeat(18)} → store installs are stranded until you PR entries/${p.id}.json`)
    }
  }

  await writeFile(join(ROOT, 'README.md'), render(plugins))
  console.log(`\n✓ README.md — ${plugins.length} plugins, ${plugins.length} icons vendored\n`)
}

// ------------------------------------------------------------------ render

function render (plugins) {
  const rows = plugins.map((p) => {
    const slug = repoSlug(p)
    // npm-sourced or malformed entries have no GitHub slug; render them unlinked
    // rather than emitting href="https://github.com/null".
    const href = slug ? `https://github.com/${slug}` : null
    const link = (inner) => (href ? `<a href="${href}">${inner}</a>` : inner)
    // Only reference an icon the vendor step actually wrote.
    const icon = p.icon?.url
      ? link(`<img src="icons/${p.id}.svg" width="44" height="44" alt="">`)
      : '&nbsp;'
    const tags = (p.tags ?? []).slice(0, 6).map((t) => `<code>${esc(t)}</code>`).join(' ')
    return `  <tr>
    <td width="76" align="center" valign="top">
      ${icon}
    </td>
    <td valign="top">
      ${link(`<b>${esc(p.displayName)}</b>`)}
      &nbsp;<code>bb plugin install ${p.id}</code>
      <br>
      ${esc(p.description)}
      <br>
      <sub>${tags}</sub>
    </td>
  </tr>`
  }).join('\n')

  return `<!--
  GENERATED FILE — do not edit by hand.
  Every change here is overwritten by \`npm run build\`, which regenerates this
  page from https://getbb.app/marketplace/v1/marketplace.json
-->

<div align="center">

# bb plugins

**${plugins.length} plugins for [bb](https://getbb.app), the agent IDE.**

<img src="https://img.shields.io/badge/plugins-${plugins.length}-1f2430?style=flat-square" alt="${plugins.length} plugins">
<a href="https://github.com/get-bb/marketplace"><img src="https://img.shields.io/badge/BB%20Community-marketplace-1f2430?style=flat-square" alt="Listed in the BB Community marketplace"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1f2430?style=flat-square" alt="MIT license"></a>

</div>

<br>

<table>
${rows}
</table>

<br>

## Install

All of these are listed in the [BB Community marketplace](https://github.com/get-bb/marketplace), so BB installs them by name:

\`\`\`sh
bb plugin install <name>
\`\`\`

Or browse them inside BB under **Settings → Plugins**.

## About this page

Generated from the marketplace catalog BB itself reads, so the names, descriptions,
tags and icons here are the same ones you see in the store.

\`\`\`sh
npm run build
\`\`\`

Plugins by [${AUTHOR}](https://github.com/${OWNER}) · MIT
`
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}\n`)
  process.exit(1)
})
