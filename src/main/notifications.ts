import { Notification } from "electron";
import type { NativeNotificationPayload } from "../shared/types";
import { logger } from "./logger";
import { iconPath } from "./constants";

export interface NotificationRouter {
  surfaceTarget(targetId: string, reason: string): void;
}

export class NativeNotifications {
  constructor(private readonly router: NotificationRouter) {}

  show(targetId: string, icon: string, payload: NativeNotificationPayload): void {
    const notification = new Notification({
      title: payload.title,
      body: payload.body ?? "",
      icon: iconPath(icon),
    });

    notification.on("click", () => {
      logger.info("notification-clicked", { targetId, tag: payload.tag ?? null });
      this.router.surfaceTarget(targetId, "notification");
    });

    logger.info("notification-shown", { targetId, tag: payload.tag ?? null });
    notification.show();
  }
}
