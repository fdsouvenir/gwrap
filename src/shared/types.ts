export type AppKind = "messages" | "gmail" | "calendar";

export interface Account {
  id: string;
  name: string;
  partition: string;
  gmailEnabled: boolean;
  calendarEnabled: boolean;
}

export interface AccountInput {
  id?: string;
  name: string;
  gmailEnabled: boolean;
  calendarEnabled: boolean;
}

export interface BoundsSnapshot {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface AppSettings {
  version: 1;
  accounts: Account[];
  windowBounds: Record<string, BoundsSnapshot>;
}

export interface TargetDescriptor {
  id: string;
  kind: AppKind;
  accountId?: string;
  label: string;
  title: string;
  url: string;
  internalOrigins: string[];
  icon: string;
  partition: string;
}

export interface NativeNotificationPayload {
  title: string;
  body?: string;
  tag?: string;
}
