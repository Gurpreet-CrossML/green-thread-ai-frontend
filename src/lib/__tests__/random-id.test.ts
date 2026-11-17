import { afterEach, describe, expect, it, vi } from "vitest";

import { randomId } from "@/lib/utils";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Plain-HTTP origins (an on-prem LAN IP) have no crypto.randomUUID.
describe("randomId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to getRandomValues when randomUUID is missing", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: real.getRandomValues.bind(real),
    });
    expect(typeof crypto.randomUUID).toBe("undefined");
    const a = randomId();
    expect(a).toMatch(UUID_V4);
    expect(randomId()).not.toBe(a);
  });

  it("uses randomUUID when it exists", () => {
    expect(randomId()).toMatch(UUID_V4);
  });
});
