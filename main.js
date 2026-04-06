const { app, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const AppInstance = require("./lib/app-instance");

app.setName("gwrap-linux");
app.setDesktopName("gwrap-linux.desktop");

let tray = null;
const instances = new Map();

const MESSAGES_CONFIG = {
  id: "messages",
  name: "Messages",
  url: "https://messages.google.com/web/conversations",
  internalUrlPattern: "https://messages.google.com",
  icon: "messages.png",
  partition: "persist:gmessages",
  preload: "preload-common.js",
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Show all windows on second launch attempt
    for (const inst of instances.values()) {
      inst.show();
    }
  });

  app.on("ready", () => {
    // Require store after app is ready (needs userData path)
    const store = require("./lib/store");

    // Always create Messages
    launchApp(MESSAGES_CONFIG);

    // Launch saved Gmail accounts
    for (const account of store.loadAccounts()) {
      launchGmail(account);
    }

    createTray();
  });
}

function launchApp(config) {
  const inst = new AppInstance(config);
  instances.set(config.id, inst);
  inst.create();
  return inst;
}

function launchGmail(account) {
  return launchApp({
    id: account.id,
    name: account.name,
    url: account.url,
    internalUrlPattern: "https://mail.google.com",
    icon: "gmail.png",
    partition: account.partition,
    preload: "preload-common.js",
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "icons", "google-g.png")
  );
  tray = new Tray(icon.resize({ width: 24, height: 24 }));
  tray.setToolTip("gwrap");
  rebuildMenu();
}

function rebuildMenu() {
  const store = require("./lib/store");
  const accounts = store.loadAccounts();

  const menuItems = [
    {
      label: "Messages",
      click: () => instances.get("messages")?.show(),
    },
    { type: "separator" },
  ];

  for (const account of accounts) {
    menuItems.push({
      label: account.name,
      click: () => instances.get(account.id)?.show(),
    });
  }

  menuItems.push({ type: "separator" });

  const manageItems = [];
  for (const account of accounts) {
    manageItems.push({
      label: `Rename "${account.name}"`,
      click: () => renameGmailAccount(account),
    });
    manageItems.push({
      label: `Remove "${account.name}"`,
      click: () => removeGmailAccount(account),
    });
  }
  manageItems.push({ type: "separator" });
  manageItems.push({
    label: "Add Gmail",
    click: addGmailAccount,
  });

  menuItems.push({
    label: "Manage Accounts",
    submenu: manageItems,
  });

  menuItems.push({ type: "separator" });

  menuItems.push({
    label: "Quit",
    click: () => {
      app.isQuitting = true;
      app.quit();
    },
  });

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
  tray.removeAllListeners("click");
  tray.on("click", () => {
    tray.popUpContextMenu();
  });
}

function addGmailAccount() {
  const store = require("./lib/store");
  const name = promptForName();
  if (!name) return;

  const account = store.addAccount(name);
  launchGmail(account);
  rebuildMenu();
}

function renameGmailAccount(account) {
  const store = require("./lib/store");
  const name = promptForName(account.name);
  if (!name) return;

  const accounts = store.loadAccounts();
  const entry = accounts.find((a) => a.id === account.id);
  if (entry) {
    entry.name = name;
    store.saveAccounts(accounts);
    // Update the running instance's config
    const inst = instances.get(account.id);
    if (inst) inst.config.name = name;
    rebuildMenu();
  }
}

function removeGmailAccount(account) {
  const { execSync } = require("child_process");
  try {
    execSync(
      `zenity --question --title="Remove Account" --text="Remove ${account.name}?"`,
      { timeout: 60000 }
    );
  } catch {
    return; // User cancelled
  }

  const store = require("./lib/store");
  store.removeAccount(account.id);

  const inst = instances.get(account.id);
  if (inst) {
    inst.destroy();
    instances.delete(account.id);
  }

  rebuildMenu();
}

function promptForName(defaultValue) {
  const { execSync } = require("child_process");
  const entryText = defaultValue || "";
  const title = defaultValue ? "Rename Account" : "Add Gmail Account";
  try {
    const name = execSync(
      `zenity --entry --title="${title}" --text="Account Name:" --entry-text="${entryText}"`,
      { encoding: "utf8", timeout: 60000 }
    ).trim();
    return name || null;
  } catch {
    return null;
  }
}

app.on("before-quit", () => {
  app.isQuitting = true;
});
