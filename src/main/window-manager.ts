import { app } from "electron";
import type { AppStore } from "./store";
import { AppInstance } from "./app-instance";
import { NativeNotifications, type NotificationRouter } from "./notifications";
import { logger } from "./logger";
import { calendarTarget, gmailTarget, messagesTarget } from "./constants";
import type { Account, AppKind, TargetDescriptor } from "../shared/types";

export interface WindowManagerEvents {
  onTargetsChanged(): void;
}

export class WindowManager implements NotificationRouter {
  private readonly instances = new Map<string, AppInstance>();
  private readonly notifications: NativeNotifications;

  constructor(
    private readonly store: AppStore,
    private readonly events: WindowManagerEvents
  ) {
    this.notifications = new NativeNotifications(this);
  }

  initialize(): void {
    this.ensureWindow(messagesTarget(), true);
    app.on("activate", () => {
      this.surfaceTarget(messagesTarget().id, "activate");
    });
  }

  surfaceTarget(targetId: string, reason: string): void {
    const descriptor = this.getDescriptor(targetId);
    if (!descriptor) {
      logger.warn("surface-target-missing", { targetId, reason });
      return;
    }

    this.ensureWindow(descriptor, true).surface(reason);
  }

  syncWithStore(): void {
    const allowedTargetIds = new Set(this.getAvailableTargets().map((target) => target.id));
    for (const [targetId, instance] of this.instances.entries()) {
      if (!allowedTargetIds.has(targetId)) {
        instance.destroy();
        this.instances.delete(targetId);
      }
    }

    this.events.onTargetsChanged();
  }

  getAccountsForKind(kind: Exclude<AppKind, "messages">): Account[] {
    return this.store.getAccounts().filter((account) =>
      kind === "gmail" ? account.gmailEnabled : account.calendarEnabled
    );
  }

  destroyAll(): void {
    for (const instance of this.instances.values()) {
      instance.destroy();
    }
    this.instances.clear();
  }

  private ensureWindow(descriptor: TargetDescriptor, initiallyVisible: boolean): AppInstance {
    let instance = this.instances.get(descriptor.id);
    if (instance && !instance.isDestroyed()) {
      return instance;
    }

    instance = new AppInstance(descriptor, this.store, this.notifications, {
      onWindowClosed: (targetId) => {
        this.instances.delete(targetId);
      },
    });
    instance.create(initiallyVisible);
    this.instances.set(descriptor.id, instance);
    logger.info("window-created", { targetId: descriptor.id, initiallyVisible });
    return instance;
  }

  private getAvailableTargets(): TargetDescriptor[] {
    const targets: TargetDescriptor[] = [messagesTarget()];
    for (const account of this.store.getAccounts()) {
      if (account.gmailEnabled) {
        targets.push(gmailTarget(account));
      }
      if (account.calendarEnabled) {
        targets.push(calendarTarget(account));
      }
    }
    return targets;
  }

  private getDescriptor(targetId: string): TargetDescriptor | undefined {
    return this.getAvailableTargets().find((target) => target.id === targetId);
  }
}
