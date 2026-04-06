import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { APP_NAME, STORE_FILENAME } from "./constants";
import { uniqueAccountId } from "./account-utils";
import type { Account, AccountInput, AppSettings } from "../shared/types";

interface LegacyAccount {
  id: string;
  name: string;
  partition: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  accounts: [],
  windowBounds: {},
};

export class AppStore {
  private readonly storePath: string;
  private settings: AppSettings;

  constructor() {
    this.storePath = path.join(app.getPath("userData"), STORE_FILENAME);
    this.settings = this.load();
  }

  getSettings(): AppSettings {
    return structuredClone(this.settings);
  }

  getAccounts(): Account[] {
    return structuredClone(this.settings.accounts);
  }

  upsertAccount(input: AccountInput): Account {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Account name is required");
    }

    const existing = this.settings.accounts.find((account) => account.id === input.id);
    if (existing) {
      existing.name = name;
      existing.gmailEnabled = input.gmailEnabled;
      existing.calendarEnabled = input.calendarEnabled;
      this.persist();
      return structuredClone(existing);
    }

    const account: Account = {
      id: uniqueAccountId(name, this.settings.accounts),
      name,
      partition: `persist:account-${Date.now()}`,
      gmailEnabled: input.gmailEnabled,
      calendarEnabled: input.calendarEnabled,
    };

    this.settings.accounts.push(account);
    this.persist();
    return structuredClone(account);
  }

  removeAccount(accountId: string): void {
    this.settings.accounts = this.settings.accounts.filter((account) => account.id !== accountId);

    for (const targetId of Object.keys(this.settings.windowBounds)) {
      if (targetId.endsWith(`:${accountId}`)) {
        delete this.settings.windowBounds[targetId];
      }
    }

    this.persist();
  }

  saveBounds(targetId: string, bounds: AppSettings["windowBounds"][string]): void {
    this.settings.windowBounds[targetId] = bounds;
    this.persist();
  }

  getBounds(targetId: string): AppSettings["windowBounds"][string] | undefined {
    return this.settings.windowBounds[targetId];
  }

  private load(): AppSettings {
    const fromDisk = this.readJson<AppSettings>(this.storePath);
    if (fromDisk) {
      return this.normalize(fromDisk);
    }

    const migrated = this.migrateLegacyAccounts();
    if (migrated.length > 0) {
      const next: AppSettings = {
        version: 1,
        accounts: migrated,
        windowBounds: {},
      };
      this.settings = next;
      this.persist();
      return next;
    }

    return structuredClone(DEFAULT_SETTINGS);
  }

  private normalize(data: AppSettings): AppSettings {
    return {
      version: 1,
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
      windowBounds: data.windowBounds ?? {},
    };
  }

  private migrateLegacyAccounts(): Account[] {
    const legacyPaths = [
      path.join(app.getPath("appData"), "gwrap-linux", "gmail-accounts.json"),
      path.join(app.getPath("appData"), APP_NAME, "gmail-accounts.json"),
      path.join(app.getPath("appData"), "gmessage-desktop", "gmail-accounts.json"),
    ];

    for (const legacyPath of legacyPaths) {
      const legacy = this.readJson<LegacyAccount[]>(legacyPath);
      if (!legacy || legacy.length === 0) {
        continue;
      }

      return legacy.map((account) => ({
        id: account.id,
        name: account.name,
        partition: account.partition,
        gmailEnabled: true,
        calendarEnabled: true,
      }));
    }

    return [];
  }

  private readJson<T>(filePath: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    } catch {
      return null;
    }
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.settings, null, 2));
  }
}
