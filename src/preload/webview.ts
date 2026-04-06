import { contextBridge, ipcRenderer } from "electron";
import type { NativeNotificationPayload } from "../shared/types";

const targetId = process.argv.find((entry) => entry.startsWith("--target-id="))?.split("=")[1] ?? "";

contextBridge.exposeInMainWorld("gwrapDesktop", {
  notify(payload: NativeNotificationPayload) {
    return ipcRenderer.invoke(`web-notification:${targetId}`, payload);
  },
});

window.addEventListener("DOMContentLoaded", () => {
  const script = document.createElement("script");
  script.textContent = `
    (() => {
      if (!window.gwrapDesktop || window.__gwrapNotificationPatched) {
        return;
      }

      window.__gwrapNotificationPatched = true;
      const NativeNotification = window.Notification;

      function WrappedNotification(title, options = {}) {
        window.gwrapDesktop.notify({
          title,
          body: options.body,
          tag: options.tag
        });

        return {
          close() {}
        };
      }

      WrappedNotification.permission = "granted";
      WrappedNotification.requestPermission = () => Promise.resolve("granted");
      WrappedNotification.prototype = NativeNotification ? NativeNotification.prototype : {};

      Object.defineProperty(window, "Notification", {
        configurable: true,
        writable: true,
        value: WrappedNotification
      });
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
});
