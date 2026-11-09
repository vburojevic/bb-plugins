#!/usr/bin/env node
/**
 * Regenerates README.md from the BB Community marketplace.
 *
 * Source of truth is https://getbb.app/marketplace/v1/marketplace.json — the same
 * catalog BB itself reads. This script filters it down to entries authored by
 * OWNER, vendors their icons into ./icons, draws the hero into ./assets, and
 * rewrites README.md. Each card's one-liner is the plugin repo's GitHub
 * description; its screenshot comes from showcase.json.
 *
 * Run it by hand:  npm run build
 * There is no CI and no cron. GITHUB_TOKEN is optional; it only lifts
 * GitHub's anonymous rate limit. Nothing here runs on its own.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hero, SPOTS } from './hero.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const OWNER = 'vburojevic'
const AUTHOR = 'Vedran Burojević'
const MARKETPLACE = 'https://getbb.app/marketplace/v1/marketplace.json'
const HUB = `https://github.com/${OWNER}/bb-plugins`

// ---------------------------------------------------------------- fetching

async function fetchJson (url) {
  const headers = { accept: 'application/json' }
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  let res = await fetch(url, { headers })
  if (res.status === 401 && headers.authorization) {
    console.warn('!  GITHUB_TOKEN was rejected; retrying without it')
    delete headers.authorization
    res = await fetch(url, { headers })
  }
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

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Text safe inside a markdown link's [label]. */
const escLink = (s) => esc(s).replace(/([[\]*_`\\])/g, '\\$1')

// These icons are authored as CSS *mask sources* for BB, which keys off alpha
// coverage and paints the result itself — so they hardcode #000 (or
// currentColor, which has no inherited context inside an <img>). Dropped
// straight into a README that is black-on-black in dark mode. Recolour them
// into an explicit pair instead, and let <picture> choose.
//
// Every paint is rewritten, brand colours included: BB shows these icons as
// one-colour masks, so the index draws them the same way, as a monochrome set.
// `none` and paint-server references (url(#…)) are left alone.
const INK = { light: '#1f2430', dark: '#c9d1d9' }

function theme (svg, colour) {
  const painted = svg.replace(/\b(stroke|fill)="(?!none"|url\()[^"]+"/gi,
                              (_, attr) => `${attr}="${colour}"`)
  // A shape with no fill of its own paints black by default (iris draws its
  // mark that way), so give the root a fill unless it already sets one.
  return painted.replace(/<svg\b(?![^>]*\sfill=)/i, `<svg fill="${colour}"`)
}

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

  // ---- read everything remote first, so a failed fetch writes nothing
  const showcase = JSON.parse(await readFile(join(ROOT, 'showcase.json'), 'utf8'))
  const icons = new Map()
  try {
    for (const p of plugins) {
      if (!showcase[p.id]) console.warn(`!  ${p.id} has no screenshot in showcase.json`)

      // One-liner: the plugin repo's own GitHub description. Only a repo that
      // really has none falls back to the marketplace's first sentence; an
      // API error (rate limit, bad token, outage) stops the build instead.
      const slug = repoSlug(p)
      p.tagline = slug ? (await fetchJson(`https://api.github.com/repos/${slug}`)).description : null
      if (!p.tagline) {
        console.warn(`!  ${p.id}: no GitHub description, using the marketplace's first sentence`)
        p.tagline = /^[^.]*\./.exec(p.description)?.[0] ?? p.description
      }

      // A full-color marketplace icon (a gradient app tile) recolors to a
      // solid square, so icon-overrides/<id>.svg can supply a monochrome mark.
      let svg = await readFile(join(ROOT, 'icon-overrides', `${p.id}.svg`), 'utf8').catch(() => null)
      if (!svg) {
        const src = p.icon?.url
        if (!src) { console.warn(`!  ${p.id} has no icon`); continue }
        const res = await fetch(new URL(src, MARKETPLACE))
        if (!res.ok) throw new Error(`icon for ${p.id} -> HTTP ${res.status}`)
        svg = await res.text()
      }
      // The hero inlines every icon into one SVG, where ids would collide.
      if (/\sid="/.test(svg)) throw new Error(`icon for ${p.id} uses id="…"; the hero can't inline it safely`)
      icons.set(p.id, svg)
    }
  } catch (err) {
    console.error(`\n✗ ${err.message}`)
    console.error('  Nothing was written. Check GITHUB_TOKEN or wait out the rate limit, then re-run.\n')
    process.exit(1)
  }

  // ---- vendor the icons (GitHub's camo proxy will not render remote SVGs)
  await mkdir(join(ROOT, 'icons'), { recursive: true })
  for (const [id, svg] of icons) {
    await writeFile(join(ROOT, 'icons', `${id}.svg`), theme(svg, INK.light))
    await writeFile(join(ROOT, 'icons', `${id}-dark.svg`), theme(svg, INK.dark))
  }

  // ---- the hero: every plugin's mark where it lives in bb
  const unplaced = plugins.map((p) => p.id).filter((id) => !SPOTS[id])
  if (unplaced.length) console.warn(`!  not placed in the hero yet (add a spot in scripts/hero.mjs): ${unplaced.join(', ')}`)
  await mkdir(join(ROOT, 'assets'), { recursive: true })
  for (const t of ['light', 'dark']) {
    await writeFile(join(ROOT, 'assets', `hero-${t}.svg`), await hero(join(ROOT, 'icons'), [...icons.keys()], t))
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

  await writeFile(join(ROOT, 'README.md'), render(plugins, showcase))
  console.log(`\n✓ README.md — ${plugins.length} plugins, ${plugins.length} icons vendored\n`)
}

// ------------------------------------------------------------------ render

/** Light icon with its dark twin, picked by GitHub's colour scheme. */
function iconTag (p, size) {
  if (!p.icon?.url) return ''
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="icons/${p.id}-dark.svg">` +
         `<img src="icons/${p.id}.svg" width="${size}" height="${size}" align="top" alt=""></picture>`
}

/** The plugin's screenshot from its own repo, linked to it, light/dark when it has both. */
function shotTag (p, s) {
  const slug = repoSlug(p)
  if (!s || !slug) return ''
  const raw = (path) => `https://raw.githubusercontent.com/${slug}/HEAD/${path}`
  const img = `<img src="${raw(s.shot)}" width="100%" alt="${esc(s.alt)}">`
  const pic = s.dark
    ? `<picture><source media="(prefers-color-scheme: dark)" srcset="${raw(s.dark)}">${img}</picture>`
    : img
  return `<a href="https://github.com/${slug}">${pic}</a>`
}

function card (p, s) {
  const slug = repoSlug(p)
  const name = esc(p.displayName)
  const title = slug ? `[${escLink(p.displayName)}](https://github.com/${slug})` : name
  const version = slug
    ? ` <a href="https://github.com/${slug}/releases/latest"><img src="https://img.shields.io/github/v/release/${slug}?style=flat-square&label=&color=57606a" alt="Latest ${name} release" align="top"></a>`
    : ''
  const tags = (p.tags ?? []).slice(0, 6).map(esc).join(' · ')
  return `<td width="50%" valign="top">

${shotTag(p, s)}

### ${iconTag(p, 20)} ${title}${version}

${esc(p.tagline)}

\`\`\`sh
bb plugin install ${p.id}
\`\`\`

<details>
<summary>More about ${name}</summary>

${esc(p.description)}

${tags ? `<sub>${tags}</sub>` : ''}
</details>

</td>`
}

function render (plugins, showcase) {
  // Two cards per row. GitHub draws tables as display:block with a
  // max-content width, so every cell is pinned to width="50%" and holds
  // full-width images: that keeps long text wrapping inside its card
  // instead of widening the table and clipping it.
  const rows = []
  for (let i = 0; i < plugins.length; i += 2) {
    const pair = plugins.slice(i, i + 2).map((p) => card(p, showcase[p.id]))
    if (pair.length === 1) pair.push('<td width="50%"></td>')
    rows.push(`<tr>\n${pair.join('\n')}\n</tr>`)
  }

  return `<!--
  GENERATED FILE — do not edit by hand.
  Every change here is overwritten by \`npm run build\`, which regenerates this
  page from https://getbb.app/marketplace/v1/marketplace.json
-->

<h1 align="center">bb plugins</h1>

<p align="center"><b>${plugins.length} plugins for <a href="https://getbb.app">bb</a>, the agent IDE.</b><br>Each one is in the BB Community marketplace and installs with one command.</p>

<p align="center">
<img src="https://img.shields.io/badge/plugins-${plugins.length}-57606a?style=flat-square" alt="${plugins.length} plugins">
<a href="https://github.com/get-bb/marketplace"><img src="https://img.shields.io/badge/BB%20Community-marketplace-57606a?style=flat-square" alt="Listed in the BB Community marketplace"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-57606a?style=flat-square" alt="MIT license"></a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
  <img src="assets/hero-light.svg" width="100%" alt="A bb window with each plugin shown where it lives in bb">
</picture>

## Install

All of these are listed in the [BB Community marketplace](https://github.com/get-bb/marketplace), so bb installs them by name:

\`\`\`sh
bb plugin install <name>
\`\`\`

> [!TIP]
> Or browse them inside bb under **Settings → Plugins**. Updates arrive the same way.

## Plugins

<table>
${rows.join('\n')}
</table>

## About this page

Generated from the marketplace catalog bb itself reads, so the names, descriptions,
tags and icons here are the same ones you see in the store. Each one-liner is the
plugin repo's GitHub description, and each screenshot comes from that repo.

\`\`\`sh
npm run build
\`\`\`

<p align="center"><sub>Plugins by <a href="https://github.com/${OWNER}">${AUTHOR}</a> · MIT</sub></p>
`
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}\n`)
  process.exit(1)
})
