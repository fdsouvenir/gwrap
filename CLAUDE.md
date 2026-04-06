# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gwrap-linux is an Electron desktop wrapper for Google Messages and Gmail on Linux. It runs Google web apps in dedicated BrowserWindow instances with system tray integration, native GNOME notifications, and multi-account Gmail support.

## Commands

- `npm start` — Run the app locally (uses `GTK_CSD=0 electron . --no-sandbox`)
- `npm run build` — Build distributable packages (deb, AppImage) via electron-builder

## Architecture

**main.js** — Entry point. Manages app lifecycle, system tray menu, single-instance lock, and Gmail account CRUD (uses zenity dialogs for user input).

**lib/app-instance.js** — `AppInstance` class wraps a BrowserWindow for each Google service. Handles window creation, IPC-based notifications, external link filtering (internal URLs stay in-app, others open in default browser), and unread count tracking from page titles.

**lib/store.js** — JSON file store for Gmail accounts, persisted to `userData/gmail-accounts.json`. Must be required after `app.ready` since it depends on `app.getPath("userData")`.

**lib/preload-common.js** — Preload script injected into all webviews. Replaces the web Notification API with IPC calls to main process so notifications go through Electron's native API (for GNOME integration). Uses `--app-id` additional argument to namespace IPC channels per instance.

### Key patterns

- Each app instance gets its own Electron session partition (`persist:*`) for isolated cookies/storage
- Window close is intercepted to hide-to-tray instead of quitting; actual quit requires `app.isQuitting` flag
- User agent is stripped of Electron identifier to avoid Google blocking
- `contextIsolation: false` is used so the preload can patch `window.Notification` directly
