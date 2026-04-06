const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const STORE_PATH = path.join(app.getPath("userData"), "gmail-accounts.json");

function loadAccounts() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(accounts, null, 2));
}

function addAccount(name) {
  const accounts = loadAccounts();
  const index = accounts.length;
  const account = {
    id: `gmail-${index}`,
    name,
    url: `https://mail.google.com/mail/u/${index}/`,
    partition: `persist:gmail-${Date.now()}`,
  };
  accounts.push(account);
  saveAccounts(accounts);
  return account;
}

function removeAccount(id) {
  const accounts = loadAccounts().filter((a) => a.id !== id);
  saveAccounts(accounts);
}

module.exports = { loadAccounts, saveAccounts, addAccount, removeAccount };
