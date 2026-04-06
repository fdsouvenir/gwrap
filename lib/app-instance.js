const { app, BrowserWindow, Notification, shell, ipcMain } = require("electron");
const path = require("path");

class AppInstance {
  constructor(config) {
    this.config = config;
    this.window = null;
  }

  create() {
    this._createWindow();
    this._setupIpc();
    this._setupExternalLinks();
    this._setupTitleWatcher();
  }

  show() {
    const bounds = this.window.getBounds();
    this.window.hide();
    this.window.setBounds(bounds);
    this.window.show();
    this.window.focus();
  }

  destroy() {
    ipcMain.removeAllListeners(`notification-clicked:${this.config.id}`);
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
  }

  _createWindow() {
    this.window = new BrowserWindow({
      width: 1100,
      height: 800,
      title: this.config.name,
      icon: path.join(__dirname, "..", "icons", this.config.icon),
      webPreferences: {
        partition: this.config.partition,
        spellcheck: true,
        preload: path.join(__dirname, this.config.preload),
        additionalArguments: [`--app-id=${this.config.id}`],
        contextIsolation: false,
      },
    });

    const ua = this.window.webContents.session
      .getUserAgent()
      .replace(/Electron\/\S+\s/, "");
    this.window.loadURL(this.config.url, { userAgent: ua });

    this.window.setAutoHideMenuBar(true);
    this.window.setMenuBarVisibility(false);
    this.window.setSkipTaskbar(true);

    this.window.on("close", (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        this.window.hide();
      }
    });

    this.window.webContents.session.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        callback(permission === "notifications" || permission === "media");
      }
    );
  }

  _setupIpc() {
    ipcMain.on(`show-notification:${this.config.id}`, (event, { title, body }) => {
      const notif = new Notification({
        title,
        body: body || "",
        icon: path.join(__dirname, "..", "icons", this.config.icon),
      });

      notif.on("click", () => {
        this.show();
      });

      notif.show();
    });
  }

  _isInternalUrl(url) {
    const pattern = this.config.internalUrlPattern;
    return (
      url.startsWith(pattern) ||
      url.startsWith("https://accounts.google.com") ||
      url.startsWith("https://myaccount.google.com") ||
      url.startsWith("https://www.google.com/intl") ||
      url.startsWith("https://gds.google.com")
    );
  }

  _setupExternalLinks() {
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (!this._isInternalUrl(url)) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    });

    this.window.webContents.on("will-navigate", (event, url) => {
      if (!this._isInternalUrl(url)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  }

  _setupTitleWatcher() {
    this.window.webContents.on("page-title-updated", (event, title) => {
      const unreadMatch = title.match(/\((\d+)\)/);
      this.unreadCount = unreadMatch ? parseInt(unreadMatch[1]) : 0;
    });
  }
}

module.exports = AppInstance;
