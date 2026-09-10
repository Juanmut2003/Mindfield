# Mindfield

## What this is

Mindfield is an app for the **psychological and fitness support of athletes**.

Long-term goal: keep athletes mentally healthy and, when needed, refer them to qualified psychiatrists. Fitness tracking is the low-friction entry point — the real value is the mental-health layer on top of it.

## Target users

Ambitious amateur and competitive athletes with elevated mental-strain risk (performance pressure, overtraining, injury layoffs).

## Core use cases (across all future build phases)

1. **Fitness tracking** — steps, pulse, sleep, training sessions.
2. **Mental-health tracking** — mood entries, journal, self-checks.
3. **AI assistant** — accompanies daily life, reflects patterns (e.g. training/sleep/mood correlations), warns on anomalies.
4. **Referral to psychiatrists** — when needed, matching to verified psychiatrists including appointment booking and secure communication.

## Planned app structure / screens

As described by the user (2026-08-24) — this is the intended shape of the app, not yet built beyond the dashboard UI shell:

- **Dashboard (Startseite)** — top-level screen; surfaces a condensed summary of data pulled from the other screens, with a **daily update** as the topmost, most prominent element.
- **Aktivitäten (Activity)** — all data the connected fitness tracker provides (steps, pulse, sleep, training sessions). This is core use case 1.
- **Kalender (Calendar)** — normal calendar features (month/week/day views, planned trainings), *plus* a display of the **mood logged for that day** — this is where use cases 1 and 2 meet on a shared timeline.
- **Journal** — where mood check-ins and free-text journal entries are actually recorded (added 2026-08-26). The Dashboard's daily-update card summarises today's mood and expands inline into a quick check-in; the Journal screen is the dedicated place for both check-ins and writing. This is the concrete UI for core use case 2.
- **KI-Assistent (AI Assistant)** — a chat interface to talk with the assistant directly. This is core use case 3.
- **Kontakte (Contacts)** — lets the athlete message/contact therapists or psychiatrists directly from within the app. This is the concrete UI for core use case 4 (referral).
- **Fitness tracker integration (future)** — eventual goal: connect to various third-party fitness trackers via their APIs so real training/pulse/sleep data flows in automatically. Not scoped in detail yet.

## Operator

Currently a one-person project (Juan), with the explicit goal of growing it into something professional and maintainable — not a throwaway prototype. Favor maintainable, well-structured choices over quick hacks, but don't over-engineer for a team/scale that doesn't exist yet (e.g. no premature microservices, keep the build/deploy process simple).

## Sensitive aspects

Because this handles mental-health data, treat these as non-functional requirements at every phase, not afterthoughts:
- Privacy and data protection for tracked mental-health data.
- Secure communication between athlete and psychiatrist.
- Reliable anomaly detection that doesn't over-alert (false-alarm fatigue undermines trust).

## Systems & tools

What this project is actually built with — read this first if you're a new Claude session and need to get oriented fast:

- **Desktop shell**: Electron. Not a website — always keep the native-app framing (own window, no browser chrome) in mind for anything UI-related.
- **Main process language**: TypeScript, compiled with `tsc`.
- **Preload bundling**: `src/main/preload.ts` is bundled to a single file with **esbuild** (`npm run build:preload`), because the renderer runs sandboxed and a sandboxed preload cannot `require()` relative files — a multi-file preload fails *silently* (no `window.mindfield`, only a `preload-error` event). `tsc` still type-checks the preload; esbuild just overwrites its output. This is the only reason esbuild is a dependency.
- **UI / renderer**: a single `.dc.html` "canvas" (`src/renderer/Homescreen.dc.html`) authored in **Claude Design** and imported via the **DesignSync MCP tool**. It's rendered client-side by `src/renderer/support.js`, a generated dc-runtime bundle (a small React-based template engine using `{{ }}` bindings, `sc-for`/`sc-if` custom elements). **Never hand-edit `support.js`** — it's generated; re-fetch it from the Claude Design project (project id `6636a48c-0b64-48f4-82ca-0e9779327888`) if it needs to change. Visual/layout changes to the UI should go through Claude Design, not ad-hoc HTML edits, where possible.
- **Testing**: Vitest.
- **Version control**: GitHub repo `Juanmut2003/Mindfield`. Work happens on feature/chore branches with Pull Requests — not committed straight to `main`. PRs are created with the `gh` CLI from the terminal. Note: `gh` was found missing on the dev machine on 2026-09-10 and reinstalled — if `gh` is not on PATH, install it (`winget install GitHub.cli`) and run `gh auth login`; that login is interactive and must be done by the operator.
- **README.md vs CLAUDE.md**: `README.md` is the human-facing explanation of the whole app (what it is, its screens, its use cases) — written in German, matching the user and the app's own UI language. `CLAUDE.md` (this file) is the working document for Claude specifically — more detail, English, workflow rules included. Keep both roughly in sync when the vision or structure changes.

## Current state

- **UI**: first dashboard screen (`src/renderer/Homescreen.dc.html`) imported from a Claude Design project via the DesignSync MCP tool. `src/renderer/support.js` is a generated dc-runtime bundle (React-based template engine) — do not hand-edit it; re-fetch from the Claude Design project instead if it needs to change.
- **Platform**: Electron desktop app, not a website. `src/main/main.ts` opens a native BrowserWindow (via `src/main/window-config.ts`) and loads `src/renderer/Homescreen.dc.html`.
- **Mental-health data layer** (`src/main/mental-health/`, issue #7): mood entries, journal entries and self-check questionnaires — domain types, validation, scoring, and a `MentalHealthStore` over a narrow `MentalHealthStorage` seam (JSON file on disk, in-memory in tests). Reachable from the renderer as `window.mindfield.mentalHealth` via `src/main/preload.ts`. See the section below for how it is meant to be used.
- **Encryption at rest** (issue #9, merged 2026-09-10): the snapshot is encrypted with a key the OS holds for this account, via Electron's `safeStorage`. `cipher.ts` holds the format logic with no Electron import; the real cipher is injected from `main.ts` and passed to `JsonFileStorage` as an option. A pre-encryption file is migrated once, after a plaintext copy is set aside. **Windows caveat worth remembering**: `safeStorage` is not purely account-scoped — the key material lives in `Local State` inside the app's own data folder, so deleting that folder or uninstalling the app makes the data unreadable. Backing up the data file alone is not enough.
- **Screens actually rendered**: Dashboard, Kalender and Journal. The Journal screen and the dashboard's daily-update card are **wired to the store** — `loadEntries()`, `submitMood()` and `submitJournal()` talk to the real `MentalHealthStore`. Only the *fitness* tiles (steps, pulse, sleep, sessions) and the calendar's events are still hard-coded sample data, because no activity data layer exists yet.
- **Nav dead ends**: the renderer routes with `showDashboard: active !== 'calendar' && active !== 'journal'`, so "Aktivität", "KI-Assistent", "Einstellungen" and the profile all silently fall back to the dashboard with a changed heading. "Kontakte" has no nav entry at all. Decided 2026-09-10: the KI-Assistent entry is to be **removed** until the feature exists, rather than left as a dead end.
- **Business logic**: apart from the mental-health data layer, not yet implemented — fitness tracking, AI assistant and psychiatrist referral are future phases, not started.
- Git remote `origin` → `https://github.com/Juanmut2003/Mindfield.git`, default branch `main`.

## Development conventions

- **Language**: TypeScript for all app code. The Electron main process lives in `src/main/*.ts`, compiled by `tsc` (see `tsconfig.json`) to `dist/main/*.js`; `package.json`'s `main` points at the compiled output. `npm start` builds then launches; `npm run build` just builds.
- **Testing**: Vitest is set up (`npm test`, config in `vitest.config.mts`). Keep pure logic (no Electron runtime import) in its own module so it's testable without a real Electron process — see `window-config.ts` + `window-config.test.ts` for the pattern: files that only need Electron's *types* should `import type` from `'electron'`, not a runtime import, so Vitest can load them standalone.
- **Structure**: `src/main` (Electron main process, compiled) and `src/renderer` (UI, currently plain HTML/JS — not run through the TS build).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- **Type-checking tests**: `tsconfig.json` excludes `*.test.ts` from the build, so Vitest (transpile-only) would not catch type errors in tests. `npm run typecheck` (`tsconfig.test.json`) checks *everything* including tests — run it alongside `npm test`.

## Mental-health data layer

`src/main/mental-health/` is the reference for how domain code in this project should look — copy the shape when building the fitness/activity layer.

- **Layering**: `types.ts` (data shapes) → `validation.ts` (input rules) → `mood.ts` / `journal.ts` / `self-check.ts` (pure functions over one concept) → `store.ts` (the only stateful thing) → `ipc.ts` + `preload.ts` (transport). Nothing below `ipc.ts` imports Electron at runtime, so it all unit-tests without an Electron process.
- **Injected clock and ids**: `MentalHealthStore.open({ now, createId })` — tests pass fixed values instead of mocking globals.
- **Persistence seam**: `MentalHealthStorage` is deliberately just `read()` / `write(snapshot)`. Encryption at rest (issue #9) should arrive as a new implementation of that interface, not as changes to the store. `MENTAL_HEALTH_SCHEMA_VERSION` guards against reading data from a newer app version.
- **IPC never rejects**: every handler answers with an `IpcResult<T>` envelope (`{ ok: true, value }` or `{ ok: false, error: { code, field, message } }`) so the UI can show a specific German message for the field the user got wrong. Error messages in the code stay English; translation is the UI's job.
- **Self-checks ship no questionnaire.** The structure exists, but choosing a validated clinical instrument (and licensing it) is a clinical decision — do not invent one and present it as a real assessment.
- **Sandbox constraint**: if you add anything to the preload, remember it must stay bundlable and must not assume Node APIs — see "Preload bundling" above. After touching the preload, verify `window.mindfield` actually exists in the running app; a broken preload fails silently.

## AI assistant — decisions taken before any code exists

Recorded 2026-09-10, when the shape of core use case 3 was discussed. None of this is
built yet; it is here so the first implementation does not quietly contradict it.

- **Consent comes first.** Users sign a data-processing consent (Einwilligungserklärung)
  at the start. No mental-health data reaches any assistant — local or remote — before
  that exists. This is a gate on the feature, not a checkbox added afterwards.
- **Sharing is the athlete's choice, per entry or per period.** The assistant does not get
  the whole journal by default. Rationale worth keeping: a journal that is known to be read
  gets written differently — more guarded, less honest — which destroys the very data
  quality the pattern analysis depends on.
- **First version is read-only and asked-for.** The assistant answers questions about a
  range the athlete selected. No automatic analyses, no unprompted warnings. The harder
  questions get decided after seeing how that feels in practice.
- **Where the model runs is still open**, and it is a fork in the road, not a detail:
  a cloud model means the most intimate data leaves the device and brings consent,
  processing agreements and a deletion concept with it; a local model keeps the privacy
  promise intact at the cost of quality. Encryption at rest was just added — sending the
  same text to a third party must be a deliberate, disclosed decision, not a side effect.
- **The warning case is unresolved and is a liability question, not a feature.** "Warns on
  anomalies" means, in the worst case, a language model reading something that sounds like
  suicidality from an athlete under pressure. What happens then must be fixed, reviewed
  text pointing at real help — never whatever the model improvises. The operator is
  discussing this with his team; do not implement anomaly warnings before that lands.
  The existing rule applies doubly here: never present generated output as a clinical
  assessment.
- **Data handover already has a seam.** `MentalHealthStore.exportSnapshot()` returns a deep
  clone precisely so it can be handed to analysis without exposing live state. Use it;
  do not reach into the store.

## Workflow rule

Build step by step. Wait for explicit instructions before starting the next feature or phase, even when the next step seems obvious from the vision above. Suggesting the next logical step is fine; implementing it without being asked is not.
