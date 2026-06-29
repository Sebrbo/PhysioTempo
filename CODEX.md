# Codex Guidance

PhysioTempo is a static webapp without a framework, bundler, or heavy runtime dependency. The application is currently organized around `index.html`, `css/style.css`, `js/app.js`, `manifest.webmanifest`, and `service-worker.js`.

## Stable Contracts

- The HTML ids in `index.html` are the main contract between the interface and `js/app.js`.
- Do not rename, remove, or repurpose an HTML id without checking every JavaScript reference first.
- Keep documentation-only, UI-only, PWA-only, and logic-only changes in small targeted PRs.

## Fragile Areas

Treat these areas as fragile and verify behavior carefully when touching them:

- Web Audio setup and beep scheduling.
- Timing logic, countdowns, rest periods, and auto-restart.
- ECC and HSR mode sequencing.
- Wake Lock lifecycle.
- Service worker cache and offline behavior.
- Existing `localStorage` data.

## PWA And Persistence

- Preserve the PWA/offline behavior when changing assets, paths, or app startup.
- Preserve existing `localStorage` keys unless a migration is planned and documented.
- Known keys include `pt_lang`, `pt_mode`, `pt_cd_sound`, and `pt_preset_v2`.

## Modernization Rules

- Prefer small, focused Pull Requests with a clear scope.
- Avoid adding a framework, bundler, or heavy dependency without prior validation.
- Modernize progressively: documentation, accessibility, CSS cleanup, isolated helpers, then tested logic extraction.
- Do not mix visual changes with audio/timing/business-logic changes unless the PR explicitly requires it.
