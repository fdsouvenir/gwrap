import { Menu, Tray, nativeImage } from "electron";
import { iconPath, messagesTarget } from "./constants";
import type { WindowManager } from "./window-manager";

export class TrayController {
  private tray: Tray | null = null;

  constructor(private readonly windowManager: WindowManager) {}

  create(): void {
    const trayIcon = nativeImage.createFromPath(iconPath("google-g.png")).resize({ width: 24, height: 24 });
    this.tray = new Tray(trayIcon);
    this.tray.setToolTip("gwrap");
    this.rebuild();
    this.tray.on("click", () => {
      this.tray?.popUpContextMenu();
    });
  }

  rebuild(): void {
    if (!this.tray) {
      return;
    }

    const menu = Menu.buildFromTemplate([
      {
        label: messagesTarget().label,
        click: () => this.windowManager.surfaceTarget(messagesTarget().id, "tray"),
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          (global as typeof global & { __GWARP_QUITTING__?: boolean }).__GWARP_QUITTING__ = true;
          this.windowManager.destroyAll();
          process.nextTick(() => {
            process.exit(0);
          });
        },
      },
    ]);

    this.tray.setContextMenu(menu);
  }
}
