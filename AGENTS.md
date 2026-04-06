# Repository Guidelines

## Project Structure & Module Organization
`main.js` is the Electron entry point and owns app lifecycle, tray setup, and account management. Shared runtime code lives in `lib/`: `app-instance.js` wraps each `BrowserWindow`, `preload-common.js` bridges web notifications to Electron IPC, and `store.js` persists Gmail account data under Electron `userData`. Static assets live in `icons/`. Build output is generated into `dist/` and should not be committed.

## Build, Test, and Development Commands
- `npm start` runs the desktop app locally with Electron using the repository root as the app package.
- `npm run build` creates Linux distributables with `electron-builder` (`deb` and `AppImage`).
- `npm install` restores dependencies when `node_modules/` is absent or stale.

Use `npm start` for manual checks after changes to tray behavior, window lifecycle, notifications, or Gmail account flows.

## Coding Style & Naming Conventions
This codebase uses CommonJS modules and 2-space indentation. Prefer double quotes, semicolons, and small focused helper functions, matching `main.js` and `lib/*.js`. Use `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for configuration constants, and descriptive file names such as `preload-common.js`.

Keep Electron-specific logic in the main process unless it must run in preload. If you add assets, place them under `icons/` and reference them with repository-relative paths.

## Testing Guidelines
There is no automated test suite yet. Until one is added, contributors should verify changes by:
- running `npm start`
- exercising Messages and Gmail windows
- checking tray actions, hide-to-tray behavior, and native notifications
- running `npm run build` for packaging-sensitive changes

If you add tests, keep them under `test/` or `tests/` and name files `*.test.js`.

## Commit & Pull Request Guidelines
This repository currently has no commit history, so use short imperative commit subjects such as `Add Gmail rename flow` or `Fix external link handling`. Keep unrelated changes out of the same commit.

Pull requests should include a concise summary, manual verification steps, and screenshots when UI or tray behavior changes. Link any related issue and call out packaging or runtime risks explicitly.

## Configuration Notes
`lib/store.js` depends on `app.getPath("userData")`, so require it only after Electron is ready. Do not commit local data, build artifacts, or `node_modules/`.
