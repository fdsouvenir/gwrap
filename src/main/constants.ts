import path from "node:path";
import { app } from "electron";
import type { Account, AppKind, TargetDescriptor } from "../shared/types";

export const APP_NAME = "gwrap";
export const APP_ID = "com.gwrap.linux";
export const STORE_FILENAME = "settings.json";
export const MESSAGES_TARGET_ID = "messages";
export const MANAGE_ACCOUNTS_WINDOW_ID = "manage-accounts";

export function iconPath(icon: string): string {
  return path.join(app.getAppPath(), "icons", icon);
}

export function messagesTarget(): TargetDescriptor {
  return {
    id: MESSAGES_TARGET_ID,
    kind: "messages",
    label: "Messages",
    title: "Messages",
    url: "https://messages.google.com/web/conversations",
    internalOrigins: [
      "https://messages.google.com",
      "https://accounts.google.com",
      "https://myaccount.google.com",
      "https://www.google.com",
      "https://gds.google.com",
    ],
    icon: "messages.png",
    partition: "persist:gmessages",
  };
}

export function accountTargetId(kind: Exclude<AppKind, "messages">, accountId: string): string {
  return `${kind}:${accountId}`;
}

export function gmailTarget(account: Account): TargetDescriptor {
  return {
    id: accountTargetId("gmail", account.id),
    kind: "gmail",
    accountId: account.id,
    label: account.name,
    title: `${account.name} Mail`,
    url: "https://mail.google.com/mail/u/0/",
    internalOrigins: [
      "https://mail.google.com",
      "https://accounts.google.com",
      "https://myaccount.google.com",
      "https://www.google.com",
      "https://gds.google.com",
    ],
    icon: "gmail.png",
    partition: account.partition,
  };
}

export function calendarTarget(account: Account): TargetDescriptor {
  return {
    id: accountTargetId("calendar", account.id),
    kind: "calendar",
    accountId: account.id,
    label: account.name,
    title: `${account.name} Calendar`,
    url: "https://calendar.google.com/calendar/u/0/r",
    internalOrigins: [
      "https://calendar.google.com",
      "https://accounts.google.com",
      "https://myaccount.google.com",
      "https://www.google.com",
      "https://gds.google.com",
    ],
    icon: "google-g.png",
    partition: account.partition,
  };
}
