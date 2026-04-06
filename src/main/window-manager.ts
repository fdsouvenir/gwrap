import { app } from "electron";
import type { AppStore } from "./store";
import { AppInstance } from "./app-instance";
import { NativeNotifications, type NotificationRouter } from "./notifications";
import { logger } from "./logger";
import { messagesTarget } from "./constants";

export class WindowManager implements NotificationRouter {
  private readonly instances = new Map<string, AppInstance>();
  private readonly notifications: NativeNotifications;

  constructor(private readonly store: AppStore) {
    this.notifications = new NativeNotifications(this);
  }

  initialize(): void {
    this.ensureMessagesWindow(true);
    app.on("activate", () => {
      this.surfaceTarget(messagesTarget().id, "activate");
    });
  }

  surfaceTarget(targetId: string, reason: string): void {
    if (targetId !== messagesTarget().id) {
      return;
    }

    this.ensureMessagesWindow(true).surface(reason);
  }

  hideAll(): void {
    for (const instance of this.instances.values()) {
      instance.hide();
    }
  }

  destroyAll(): void {
    for (const instance of this.instances.values()) {
      instance.destroy();
    }
    this.instances.clear();
  }

  private ensureMessagesWindow(initiallyVisible: boolean): AppInstance {
    const target = messagesTarget();
    let instance = this.instances.get(target.id);
    if (instance && !instance.isDestroyed()) {
      return instance;
    }

    instance = new AppInstance(target, this.store, this.notifications, {
      onWindowClosed: (targetId) => {
        this.instances.delete(targetId);
      },
    });
    instance.create(initiallyVisible);
    this.instances.set(target.id, instance);
    logger.info("window-created", { targetId: target.id, initiallyVisible });
    return instance;
  }
}
