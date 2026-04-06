import { Menu, Tray, nativeImage } from "electron";
import { accountTargetId, iconPath, messagesTarget } from "./constants";
import type { WindowManager } from "./window-manager";

export class TrayController {
  private tray: Tray | null = null;

  constructor(
    private readonly windowManager: WindowManager,
    private readonly openManageAccounts: () => void,
    private readonly quitApp: () => void
  ) {}

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
        icon: nativeImage.createFromPath(iconPath("messages.png")).resize({ width: 16, height: 16 }),
        click: () => this.windowManager.surfaceTarget(messagesTarget().id, "tray"),
      },
      { type: "separator" },
      {
        label: "Gmail",
        icon: nativeImage.createFromPath(iconPath("gmail.png")).resize({ width: 16, height: 16 }),
        submenu: this.buildAppSubmenu("gmail"),
      },
      {
        label: "Calendar",
        icon: nativeImage.createFromPath(iconPath("google-g.png")).resize({ width: 16, height: 16 }),
        submenu: this.buildAppSubmenu("calendar"),
      },
      { type: "separator" },
      {
        label: "Manage Accounts",
        click: () => this.openManageAccounts(),
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => this.quitApp(),
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  private buildAppSubmenu(kind: "gmail" | "calendar") {
    const accounts = this.windowManager.getAccountsForKind(kind);
    if (accounts.length === 0) {
      return [{ label: `No ${kind} accounts`, enabled: false }];
    }

    return accounts.map((account) => ({
      label: account.name,
      click: () => this.windowManager.surfaceTarget(accountTargetId(kind, account.id), "tray"),
    }));
  }
}
