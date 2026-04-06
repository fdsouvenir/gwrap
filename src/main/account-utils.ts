import type { Account } from "../shared/types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function uniqueAccountId(name: string, existingAccounts: Account[]): string {
  const existingIds = new Set(existingAccounts.map((account) => account.id));
  const base = slugify(name) || "account";
  let candidate = base;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
