<!--
  GENERATED FILE — do not edit by hand.
  Every change here is overwritten by `npm run build`, which regenerates this
  page from https://getbb.app/marketplace/v1/marketplace.json
-->

<div align="center">

# bb plugins

**10 plugins for [bb](https://getbb.app), the agent IDE.**

<img src="https://img.shields.io/badge/plugins-10-57606a?style=flat-square" alt="10 plugins">
<a href="https://github.com/get-bb/marketplace"><img src="https://img.shields.io/badge/BB%20Community-marketplace-57606a?style=flat-square" alt="Listed in the BB Community marketplace"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-57606a?style=flat-square" alt="MIT license"></a>

</div>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/xcode-dark.svg"><img src="icons/xcode.svg" width="20" height="20" align="top" alt=""></picture> [Xcode](https://github.com/vburojevic/bb-plugin-xcode)

Tracks every Xcode build and test on the machine with no per-project configuration — live progress, verdicts, errors with file:line, history and trends — and streams the simulators they run on into the panel with full touch input, a build-aware device picker, SwiftUI preview diffs, and gated agent tools.

```sh
bb plugin install xcode
```

<sub>xcode · ios · simulator · builds · tests · swiftui</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/handoff-dark.svg"><img src="icons/handoff.svg" width="20" height="20" align="top" alt=""></picture> [Handoff](https://github.com/vburojevic/bb-plugin-handoff)

Moves a whole session between agents and machines in both directions: hands a bb thread's rendered transcript to another provider (optionally on another enrolled machine, carrying uncommitted work as a patch), or adopts a Claude Code, Codex, Gemini CLI or OpenCode session from your terminal as a bb thread in the same directory.

```sh
bb plugin install handoff
```

<sub>handoff · session · transcript · providers · machines · claude-code</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/floating-terminal-dark.svg"><img src="icons/floating-terminal.svg" width="20" height="20" align="top" alt=""></picture> [Floating Terminal](https://github.com/vburojevic/bb-plugin-floating-terminal)

Adds a draggable terminal window over bb, opened from the sidebar footer or Ctrl+`, with a tab per shell in any project checkout or machine home directory; tabs are persisted, so a reload or a bb restart reattaches to the same shells with their scrollback.

```sh
bb plugin install floating-terminal
```

<sub>terminal · shell · developer-tools · xterm · pty · tabs</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/floating-notes-dark.svg"><img src="icons/floating-notes.svg" width="20" height="20" align="top" alt=""></picture> [Floating Notes](https://github.com/vburojevic/bb-plugin-floating-notes)

Keep a note beside the work it belongs to, one keystroke from any thread. Notes group themselves by project, thread and day, so nothing lands in a flat pile. Stickies pin to a thread or a project and appear only while you are looking at it, and every thread gets a scratchpad your agents can append findings to. Writes real markdown — clickable checklists, highlighted code fences, wiki links — and stores everything in a local SQLite file with no account and no network.

```sh
bb plugin install floating-notes
```

<sub>notes · sticky-notes · markdown · scratchpad · checklists · capture</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/prompts-dark.svg"><img src="icons/prompts.svg" width="20" height="20" align="top" alt=""></picture> [Prompts](https://github.com/vburojevic/bb-plugin-prompts)

Stashes prompts you write while an agent is busy and injects, schedules, or auto-sends them when it next goes idle, alongside a searchable snippet library with {{fill-in}} templates.

```sh
bb plugin install prompts
```

<sub>prompts · queue · snippets · templates · composer · scheduling</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/prompt-enhancer-dark.svg"><img src="icons/prompt-enhancer.svg" width="20" height="20" align="top" alt=""></picture> [Prompt Enhancer](https://github.com/vburojevic/bb-plugin-prompt-enhancer)

Rewrites the composer draft into a clearer prompt through a hidden bb thread, keeping follow-ups short, preserving @mentions and file paths, and offering Undo.

```sh
bb plugin install prompt-enhancer
```

<sub>composer · prompt · writing · interface · keyboard-shortcuts</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/iris-dark.svg"><img src="icons/iris.svg" width="20" height="20" align="top" alt=""></picture> [Iris](https://github.com/vburojevic/bb-plugin-iris)

Turns agent replies into live cards you can use: charts, test runs, decisions, plans and small apps, drawn in your bb theme. Agents pick from 120 components on their own and check each card before you see it, so a status report arrives as metrics and progress, and proof of done as criteria with their evidence. Sliders and toggles recompute cards in place, buttons and pickers send your answer back to the agent, and live cards re-read files every 2 seconds while a job runs. Cards also read bb itself: the thread's context use, the threads it started, its pull request, commits and plan usage. Adds about 15k tokens of instructions to each top-level session, and maps and photos call OpenStreetMap, Photon and Wikimedia Commons unless you turn web lookups off.

```sh
bb plugin install iris
```

<sub>inline-ui · generative-ui · charts · interactive · components · test-reports</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/linear-dark.svg"><img src="icons/linear.svg" width="20" height="20" align="top" alt=""></picture> [Linear](https://github.com/vburojevic/bb-plugin-linear)

Linear inside bb — a list-first issue browser, inbox, and create dialog served from a local mirror, thirteen linear_* agent tools, a bb linear CLI, and every thread resolving which issue it works on, shown live in the header and side panel and injected into agent context.

```sh
bb plugin install linear
```

<sub>linear · issues · issue-tracking · inbox · agent-tools · threads</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/pets-dark.svg"><img src="icons/pets.svg" width="20" height="20" align="top" alt=""></picture> [Pets](https://github.com/vburojevic/bb-plugin-pets)

Adds a pixel companion to the BB window that mirrors your fleet, walks to threads waiting on you, and earns XP from finished turns.

```sh
bb plugin install pets
```

<sub>companion · interface · pixel-art · threads · ai-art</sub>

### <picture><source media="(prefers-color-scheme: dark)" srcset="icons/ayu-dark.svg"><img src="icons/ayu.svg" width="20" height="20" align="top" alt=""></picture> [Ayu](https://github.com/vburojevic/bb-plugin-ayu)

Adds the three ayu themes (Light, Dark and Mirage) and a settings panel that switches between them and copies any colour from the palette.

```sh
bb plugin install ayu
```

<sub>themes · appearance · colors · syntax-highlighting · interface · ayu</sub>

## Install

All of these are listed in the [BB Community marketplace](https://github.com/get-bb/marketplace), so BB installs them by name:

```sh
bb plugin install <name>
```

Or browse them inside BB under **Settings → Plugins**.

## About this page

Generated from the marketplace catalog BB itself reads, so the names, descriptions,
tags and icons here are the same ones you see in the store.

```sh
npm run build
```

Plugins by [Vedran Burojević](https://github.com/vburojevic) · MIT
