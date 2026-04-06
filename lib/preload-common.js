const { ipcRenderer } = require("electron");

const appId = process.argv.find((a) => a.startsWith("--app-id="))?.split("=")[1];

// Replace web Notification with IPC to main process
// Main process re-sends via Electron's Notification API for proper GNOME integration
const OriginalNotification = window.Notification;

window.Notification = function (title, options = {}) {
  ipcRenderer.send(`show-notification:${appId}`, { title, body: options.body, icon: options.icon });
  // Return a stub that looks like a Notification
  const stub = Object.create(OriginalNotification.prototype);
  stub.close = () => {};
  return stub;
};

window.Notification.requestPermission = (cb) => {
  if (cb) cb("granted");
  return Promise.resolve("granted");
};

Object.defineProperty(window.Notification, "permission", {
  get: () => "granted",
});
