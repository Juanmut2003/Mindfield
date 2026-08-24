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

## Operator

Currently a one-person project (Juan), with the explicit goal of growing it into something professional and maintainable — not a throwaway prototype. Favor maintainable, well-structured choices over quick hacks, but don't over-engineer for a team/scale that doesn't exist yet (e.g. no premature microservices, keep the build/deploy process simple).

## Sensitive aspects

Because this handles mental-health data, treat these as non-functional requirements at every phase, not afterthoughts:
- Privacy and data protection for tracked mental-health data.
- Secure communication between athlete and psychiatrist.
- Reliable anomaly detection that doesn't over-alert (false-alarm fatigue undermines trust).

## Current state

- **UI**: first dashboard screen (`src/renderer/Homescreen.dc.html`) imported from a Claude Design project via the DesignSync MCP tool. `src/renderer/support.js` is a generated dc-runtime bundle (React-based template engine) — do not hand-edit it; re-fetch from the Claude Design project instead if it needs to change.
- **Platform**: Electron desktop app, not a website. `src/main/main.ts` opens a native BrowserWindow (via `src/main/window-config.ts`) and loads `src/renderer/Homescreen.dc.html`.
- **Business logic**: not yet implemented (tracking, journal, AI assistant, psychiatrist referral are future phases, not started).
- Git remote `origin` → `https://github.com/Juanmut2003/Mindfield.git`, default branch `main`.

## Development conventions

- **Language**: TypeScript for all app code. The Electron main process lives in `src/main/*.ts`, compiled by `tsc` (see `tsconfig.json`) to `dist/main/*.js`; `package.json`'s `main` points at the compiled output. `npm start` builds then launches; `npm run build` just builds.
- **Testing**: Vitest is set up (`npm test`, config in `vitest.config.mts`). Keep pure logic (no Electron runtime import) in its own module so it's testable without a real Electron process — see `window-config.ts` + `window-config.test.ts` for the pattern: files that only need Electron's *types* should `import type` from `'electron'`, not a runtime import, so Vitest can load them standalone.
- **Structure**: `src/main` (Electron main process, compiled) and `src/renderer` (UI, currently plain HTML/JS — not run through the TS build).
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.).

## Workflow rule

Build step by step. Wait for explicit instructions before starting the next feature or phase, even when the next step seems obvious from the vision above. Suggesting the next logical step is fine; implementing it without being asked is not.
