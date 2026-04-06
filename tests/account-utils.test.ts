import { describe, expect, it } from "vitest";
import { uniqueAccountId } from "../src/main/account-utils";

describe("uniqueAccountId", () => {
  it("slugifies account names", () => {
    const accountId = uniqueAccountId("FDS Consulting", []);
    expect(accountId).toBe("fds-consulting");
  });

  it("avoids duplicates", () => {
    const accountId = uniqueAccountId("Personal", [
      {
        id: "personal",
        name: "Personal",
        partition: "persist:account-1",
        gmailEnabled: true,
        calendarEnabled: true,
      },
    ]);

    expect(accountId).toBe("personal-2");
  });
});
