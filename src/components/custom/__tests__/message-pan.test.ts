import { describe, expect, it } from "vitest";

import { describeMessage } from "@/components/custom/message-pan";
import type { ThreadMessage } from "@/redux/api-slice/thread-slice";

const base: ThreadMessage = {
  id: 1,
  role: "assistant",
  message: "hi",
  created_at: "2026-11-17T10:00:00Z",
  messaged_by: "",
};

describe("describeMessage", () => {
  it("labels a bot reply as the AI", () => {
    const m = describeMessage(base, "me@x.io", "Ann Lee");
    expect(m.isAi).toBe(true);
    expect(m.senderLabel).toBe("AI Assistant");
    expect(m.avatarLabel).toBe("AI");
  });

  it("labels my own just-sent reply as You, not the AI", () => {
    const m = describeMessage(
      { ...base, messaged_by: "Priya Shah", messaged_by_email: "ME@x.io" },
      "me@x.io",
      null,
    );
    expect(m.isAi).toBe(false);
    expect(m.senderLabel).toBe("You");
    expect(m.avatarLabel).toBe("PS");
  });

  it("never shows a staff email from the internal-note API", () => {
    const m = describeMessage(
      {
        ...base,
        role: "system",
        message_type: "internal",
        agent_name: "Priya Shah (priya@x.io)",
      },
      "me@x.io",
      null,
    );
    expect(m.isInternalNote).toBe(true);
    expect(m.staffName).toBe("Priya Shah");
  });

  it("uses the customer's name and initials", () => {
    const m = describeMessage({ ...base, role: "user" }, "me@x.io", "Ann Lee");
    expect(m.senderLabel).toBe("Ann Lee");
    expect(m.avatarLabel).toBe("AL");
  });

  it("calls a customer with no name a Guest", () => {
    const m = describeMessage({ ...base, role: "user" }, "me@x.io", null);
    expect(m.senderLabel).toBe("Guest");
    expect(m.avatarLabel).toBe("G");
  });
});
