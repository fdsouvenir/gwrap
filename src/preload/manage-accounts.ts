import { contextBridge, ipcRenderer } from "electron";
import type { Account, AccountInput } from "../shared/types";

contextBridge.exposeInMainWorld("manageAccountsApi", {
  list(): Promise<Account[]> {
    return ipcRenderer.invoke("manage-accounts:list");
  },
  save(input: AccountInput): Promise<Account> {
    return ipcRenderer.invoke("manage-accounts:save", input);
  },
  remove(accountId: string): Promise<Account[]> {
    return ipcRenderer.invoke("manage-accounts:remove", accountId);
  },
});
