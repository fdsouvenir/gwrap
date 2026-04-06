import path from "node:path";
import {
  BrowserWindow,
  ipcMain,
  shell,
  type BrowserWindowConstructorOptions,
  type Rectangle,
} from "electron";
import type { AppStore } from "./store";
import type { NativeNotifications } from "./notifications";
import type { TargetDescriptor } from "../shared/types";
import { logger } from "./logger";
import { RetryController } from "./retry";
import { iconPath } from "./constants";

export interface AppInstanceEvents {
  onWindowClosed(targetId: string): void;
}

const RETRYABLE_ERROR_CODES = new Set([-2, -3, -6, -7, -21, -100, -101, -105, -106, -118, -137]);

export class AppInstance {
  private window: BrowserWindow | null = null;
  private readonly retryController: RetryController;

  constructor(
    readonly descriptor: TargetDescriptor,
    private readonly store: AppStore,
    private readonly notifications: NativeNotifications,
    private readonly events: AppInstanceEvents
  ) {
    this.retryController = new RetryController(3, 1500, () => {
      logger.warn("retrying-window-load", { targetId: this.descriptor.id });
      this.window?.webContents.reloadIgnoringCache();
    });
  }

  create(initiallyVisible: boolean): BrowserWindow {
    const bounds = this.store.getBounds(this.descriptor.id);
    const options: BrowserWindowConstructorOptions = {
      width: bounds?.width ?? 1180,
      height: bounds?.height ?? 860,
      x: bounds?.x,
      y: bounds?.y,
      show: initiallyVisible,
      title: this.descriptor.title,
      icon: iconPath(this.descriptor.icon),
      autoHideMenuBar: true,
      backgroundColor: "#101318",
      webPreferences: {
        partition: this.descriptor.partition,
        preload: path.join(__dirname, "..", "preload", "webview.js"),
        contextIsolation: true,
        sandbox: false,
        nodeIntegration: false,
        additionalArguments: [`--target-id=${this.descriptor.id}`],
      },
    };

    this.window = new BrowserWindow(options);
    this.window.setMenuBarVisibility(false);
    void this.window.loadURL(this.descriptor.url, { userAgent: this.sanitizedUserAgent() });
    this.configureWindowEvents();
    this.configureNavigation();
    this.configureNotifications();
    this.configurePermissions();
    return this.window;
  }

  isDestroyed(): boolean {
    return !this.window || this.window.isDestroyed();
  }

  surface(reason: string): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create(true);
      logger.info("window-recreated", { targetId: this.descriptor.id, reason });
      return;
    }

    if (this.window.isMinimized()) {
      this.window.restore();
    }

    this.window.show();
    this.window.moveTop();
    this.window.focus();
    logger.info("window-surfaced", { targetId: this.descriptor.id, reason });
  }

  hide(): void {
    this.window?.hide();
  }

  destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }

  private configureWindowEvents(): void {
    if (!this.window) {
      return;
    }

    this.window.on("close", (event) => {
      const currentWindow = this.window;
      if (!currentWindow || currentWindow.isDestroyed()) {
        return;
      }

      if ((global as typeof global & { __GWARP_QUITTING__?: boolean }).__GWARP_QUITTING__) {
        return;
      }

      event.preventDefault();
      currentWindow.hide();
      logger.info("window-hidden", { targetId: this.descriptor.id, reason: "close" });
    });

    this.window.on("resize", () => {
      this.persistBounds();
    });

    this.window.on("move", () => {
      this.persistBounds();
    });

    this.window.webContents.on("did-finish-load", () => {
      this.retryController.reset();
      logger.info("window-load-finished", { targetId: this.descriptor.id });
    });

    this.window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) {
        return;
      }

      logger.warn("window-load-failed", {
        targetId: this.descriptor.id,
        errorCode,
        errorDescription,
        validatedURL,
      });

      if (RETRYABLE_ERROR_CODES.has(errorCode)) {
        this.retryController.schedule();
      }
    });

    this.window.webContents.on("render-process-gone", (_event, details) => {
      logger.error("render-process-gone", { targetId: this.descriptor.id, reason: details.reason });
      this.retryController.schedule();
    });

    this.window.on("closed", () => {
      this.window = null;
      this.events.onWindowClosed(this.descriptor.id);
      logger.info("window-closed", { targetId: this.descriptor.id });
    });
  }

  private configureNavigation(): void {
    if (!this.window) {
      return;
    }

    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (!this.isInternalUrl(url)) {
        void shell.openExternal(url);
      }
      return { action: "deny" };
    });

    this.window.webContents.on("will-navigate", (event, url) => {
      if (!this.isInternalUrl(url)) {
        event.preventDefault();
        void shell.openExternal(url);
      }
    });
  }

  private configurePermissions(): void {
    if (!this.window) {
      return;
    }

    this.window.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === "notifications" || permission === "media");
    });
  }

  private configureNotifications(): void {
    const channel = `web-notification:${this.descriptor.id}`;
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (_event, payload) => {
      this.notifications.show(this.descriptor.id, this.descriptor.icon, payload);
    });
  }

  private isInternalUrl(url: string): boolean {
    return this.descriptor.internalOrigins.some((origin) => url.startsWith(origin));
  }

  private sanitizedUserAgent(): string {
    if (!this.window) {
      return "";
    }

    return this.window.webContents.session.getUserAgent().replace(/Electron\/\S+\s/, "");
  }

  private persistBounds(): void {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }

    const bounds = this.window.getBounds() as Rectangle;
    this.store.saveBounds(this.descriptor.id, {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    });
  }
}
