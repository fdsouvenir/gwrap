import { app } from "electron";
import { APP_ID, APP_NAME, messagesTarget } from "./constants";
import { logger } from "./logger";
import { AppStore } from "./store";
import { WindowManager } from "./window-manager";
import { TrayController } from "./tray";

declare global {
  var __GWARP_QUITTING__: boolean | undefined;
}

app.setName(APP_NAME);
(app as typeof app & { setDesktopName?: (name: string) => void }).setDesktopName?.(`${APP_NAME}.desktop`);
app.setAppUserModelId(APP_ID);

const gotLock = app.requestSingleInstanceLock();

let windowManager: WindowManager | null = null;

if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  windowManager?.surfaceTarget(messagesTarget().id, "second-instance");
});

app.whenReady().then(() => {
  logger.init();
  logger.info("app-ready");

  process.on("uncaughtException", (error) => {
    logger.error("uncaught-exception", { message: error.message, stack: error.stack });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled-rejection", { reason: String(reason) });
  });

  const store = new AppStore();
  windowManager = new WindowManager(store);
  const trayController = new TrayController(windowManager);
  windowManager.initialize();
  trayController.create();
});

app.on("before-quit", () => {
  global.__GWARP_QUITTING__ = true;
});
