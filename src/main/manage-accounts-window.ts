import path from "node:path";
import { BrowserWindow, app, ipcMain } from "electron";
import type { AppStore } from "./store";
import type { AccountInput } from "../shared/types";

export interface ManageAccountsEvents {
  onAccountsChanged(): void;
}

export class ManageAccountsWindow {
  private window: BrowserWindow | null = null;

  constructor(
    private readonly store: AppStore,
    private readonly events: ManageAccountsEvents
  ) {
    ipcMain.handle("manage-accounts:list", () => this.store.getAccounts());
    ipcMain.handle("manage-accounts:save", (_event, input: AccountInput) => {
      const account = this.store.upsertAccount(input);
      this.events.onAccountsChanged();
      return account;
    });
    ipcMain.handle("manage-accounts:remove", (_event, accountId: string) => {
      this.store.removeAccount(accountId);
      this.events.onAccountsChanged();
      return this.store.getAccounts();
    });
  }

  show(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 620,
      height: 720,
      title: "Manage Accounts",
      autoHideMenuBar: true,
      backgroundColor: "#f6f4ee",
      webPreferences: {
        preload: path.join(__dirname, "..", "preload", "manage-accounts.js"),
        contextIsolation: true,
        sandbox: false,
      },
    });

    this.window.setMenuBarVisibility(false);
    void this.window.loadFile(path.join(app.getAppPath(), "assets", "manage-accounts.html"));
    this.window.on("closed", () => {
      this.window = null;
    });
  }
}
